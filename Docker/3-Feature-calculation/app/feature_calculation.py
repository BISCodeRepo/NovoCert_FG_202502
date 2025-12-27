import os
import logging
import numpy as np
import pandas as pd
import re
import glob

import csv as csvs
from datetime import datetime

import sys  
import argparse
import gzip 

import os
os.environ["CUDA_VISIBLE_DEVICES"] = ""   
os.environ["JAX_PLATFORMS"] = "cpu"       
os.environ["XLA_PYTHON_CLIENT_PREALLOCATE"] = "false"  
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"


import logging
import plotly.io

logging.basicConfig(level=logging.INFO)
plotly.io.renderers.default = "plotly_mimetype+notebook"


from psm_utils.io import read_file

from ms2rescore.feature_generators.basic import BasicFeatureGenerator
from ms2rescore.feature_generators.ms2pip import MS2PIPFeatureGenerator
from ms2rescore.feature_generators.deeplc import DeepLCFeatureGenerator


from psm_utils import PSM, PSMList
from pyteomics import mztab,mgf


def get_ptm_peptide(peptide):
    """peptide: str 또는 pandas.Series 모두 지원"""
    mappings = [
        ('M+15.995', 'M[ox]'),
        ('C+57.021', 'C'),
        ('+42.011',  '[ac]-'),
        ('+43.006',  '[ca]-'),
        ('N+0.984',  'N[de]'),
        ('Q+0.984',  'Q[de]'),
        ('-17.027',  '[al]-'),
    ]

    # pandas Series인 경우
    if isinstance(peptide, pd.Series):
        s = peptide.astype(str)
        for old, new in mappings:
            s = s.str.replace(old, new, regex=False)  # Series 전용
        return s

    # 그 외 (단일 문자열 등)
    s = str(peptide)
    for old, new in mappings:
        s = s.replace(old, new)  # str.replace에는 regex 인자 없음
    return s


def get_nonnum_peptide(pep):
    result_pep = pep
    result_pep = re.sub('[^a-zA-Z]', '',result_pep)
    return result_pep


def combine_columns(col_list,separate):
    result = col_list[0]
    for col in col_list[1:]:
        if not pd.isna(col):
            result += separate + str(col)
    return result

def get_run(source_file):
    tmp = source_file
    return tmp+'.mgf'


def get_pep_len(pep):
    return len(pep)


def get_sourcefile(psmid):
    tmp = psmid
    return tmp[0:tmp.rfind('_')]


def get_scan(psmid):
    tmp = psmid
    return int(tmp[tmp.rfind('_')+1:])


def get_casanovo_changed_df(ori_df):

    ori_df['Source File'] = ori_df.apply(lambda x: get_sourcefile(x['SS']), axis=1)
    ori_df['Tag length'] = ori_df.apply(lambda x: get_pep_len(x['Peptide']), axis=1)
    ori_df['z'] = ori_df['z'].apply(lambda x: int(x))
    ori_df['Casanovo score'] = ori_df['Casanovo score'].apply(lambda x: float(x))
    
    tmp_df = ori_df[['Source File','Scan','Peptide','Casanovo score','z','m/z','RT','Tag length','run']]
    print(len(tmp_df))
    
    tmp_df['rank_first'] = tmp_df.groupby(['Source File','Scan'])['Casanovo score'].rank(method='first', ascending=False)
    
    tmp_df['Peptide'] = tmp_df['Peptide'].apply(lambda x: x.replace('I','L').replace('(','').replace(')',''))
    
    tmp_df['msp_pep'] = tmp_df.apply(lambda x: get_ptm_peptide(x['Peptide']), axis=1)
    tmp_df['peptide'] = tmp_df.apply(lambda x: get_nonnum_peptide(x['Peptide']), axis=1)
    tmp_df['peptidoform'] = tmp_df.apply(lambda x: combine_columns([x['msp_pep'],x['z']],'/'), axis=1)

    tmp_df['SS'] = tmp_df.apply(lambda x: combine_columns([x['Source File'],x['Scan']],'_'), axis=1)
    
    tmp_df['ID'] = tmp_df.apply(lambda x: combine_columns([x['SS'],x['peptide']],'_'), axis=1)
    tmp_df['IDD'] = tmp_df.apply(lambda x: combine_columns([x['SS'],x['Peptide']],'_'), axis=1)

    tmp_df = tmp_df[(tmp_df['Tag length']>=6)&(tmp_df['Tag length']<=60)]
    tmp_df = tmp_df[tmp_df['z']<=6]
    print(len(tmp_df))
    
    return tmp_df



def get_bins(desired_bin_size, m,max_val,min_val):
    #min_val = min(m)
    #max_val = max(m)
    min_boundary =  -1.0 * (min_val % desired_bin_size - min_val)
    max_boundary = max_val - max_val % desired_bin_size + desired_bin_size
    n_bins = int((max_boundary - min_boundary) / desired_bin_size) + 1
    bins = np.linspace(min_boundary, max_boundary, n_bins)
    
    return bins


def get_ss(spectrumId,run):
    tmp  = run
    return tmp.split('.')[0]+"_"+str(spectrumId)
    

def psm_list_to_df(psm_list,pd_df):
    records = []
    for psm in psm_list.psm_list:   # PSMList 객체 안의 psm_list 순회
        base = {
            "spectrum_id": psm.spectrum_id,
            "run": psm.run,
            "peptidoform": str(psm.peptidoform),
        }
        # rescoring_features dict 병합
        if psm.rescoring_features:
            base.update(psm.rescoring_features)
        records.append(base)
    psm_df = pd.DataFrame(records)
    
    psm_df['SS'] =  psm_df.apply(lambda x: get_ss(x['spectrum_id'],x['run']),axis=1)
    
    pd_tmp = pd_df[['SS','Peptide','Casanovo score','z','Tag length','m/z']]
    pd_tmp = pd_tmp.rename(columns={'Tag length':'pep_len'})

    complete_df = pd.merge(pd_tmp,psm_df,on='SS',how='inner')
    complete_df["SA"] = 1 - (2/np.pi) * np.arccos(np.clip(complete_df["cos"], -1, 1))
    
    return complete_df


def _open_text(path):
    if path.endswith(".gz"):
        return gzip.open(path, "rt", encoding="utf-8", errors="replace")
    return open(path, "r", encoding="utf-8", errors="replace")


def read_mztab_psm(path: str) -> pd.DataFrame:

    # 파일 열기 (gzip 지원)
    if path.endswith(".gz"):
        fh = gzip.open(path, "rt", encoding="utf-8", errors="replace")
    else:
        fh = open(path, "r", encoding="utf-8", errors="replace")

    headers = None
    rows = []
    try:
        for line in fh:
            if not line or line.startswith("#"):
                continue
            line = line.rstrip("\n")
            # 탭으로 분리
            parts = line.split("\t")
            if not parts:
                continue
            rec_type = parts[0]

            if rec_type == "PSH":
                # 첫 칼럼 'PSH'를 제외한 나머지가 컬럼명
                headers = parts[1:]
            elif rec_type == "PSM":
                if headers is None:
                    raise ValueError("mzTab 파일에 PSH(PSM 헤더) 라인이 없습니다.")
                # 첫 칼럼 'PSM' 제외하고 데이터 매핑
                vals = parts[1:]
                # 길이 차이 방어
                if len(vals) < len(headers):
                    vals += [""] * (len(headers) - len(vals))
                elif len(vals) > len(headers):
                    vals = vals[:len(headers)]
                rows.append(dict(zip(headers, vals)))
            else:
                # 다른 섹션(PRH/PRT/PEH/PEP/SMH/SML/MTD 등)은 무시
                continue
    finally:
        fh.close()

    if not rows:
        raise ValueError("PSM 레코드를 찾지 못했습니다. 파일이 올바른 mzTab(PSM)인지 확인하세요.")
    return pd.DataFrame(rows)



def read_mztab_msrun_locations(path: str) -> dict:

    msrun_to_path = {}
    with _open_text(path) as fh:
        for line in fh:
            if not line or line.startswith("#"):
                continue
            parts = line.rstrip("\n").split("\t")
            if not parts or parts[0] != "MTD":
                continue
            if len(parts) < 3:
                continue
            key, val = parts[1], parts[2]
            # key 예: ms_run[1]-location
            m = re.search(r"ms_run\[(\d+)\]-location", key)
            if m:
                rid = int(m.group(1))
                msrun_to_path[rid] = val
    return msrun_to_path


def attach_mgf_metadata(psm_df: pd.DataFrame,
                        picked: dict,
                        msrun_to_full: dict,
                        *,
                        inplace: bool = False) -> pd.DataFrame:
    """
    psm_df에 MGF 메타데이터(파일명, 전체경로, scan, RT)를 부착.
    - psm_df: 'ms_run_id', 'mgf_index' 컬럼을 포함해야 함 (int 또는 NaN)
    - picked: {(mgf_fullpath, index): {'params':..., 'm/z array':..., 'intensity array':...}}
    - msrun_to_full: {ms_run_id(int): mgf_fullpath(str)}
    - inplace: True면 원본 psm_df에 바로 컬럼 추가, False면 복사본 반환
    """
    df = psm_df if inplace else psm_df.copy()

    # -------- helpers --------
    _scan_pat_title = re.compile(r'(?:\bscan=(\d+))|(?:\bSCAN=(\d+))|(?:\bscans?=(\d+))')
    _index_pat_title = re.compile(r'\bindex=(\d+)', re.IGNORECASE)

    def _get_case(params, key):
        if not isinstance(params, dict):
            return None
        if key in params:
            return params.get(key)
        k_lower = key.lower()
        for k, v in params.items():
            if str(k).lower() == k_lower:
                return v
        return None

    def _extract_scan(params, title_fallback=None):
        # 1) SCANS/SCAN 키 우선
        v = _get_case(params, 'SCANS')
        if v is None:
            v = _get_case(params, 'SCAN')
        if v is not None:
            if isinstance(v, (list, tuple)) and v:
                try:
                    return int(str(v[0]).strip())
                except Exception:
                    pass
            try:
                return int(str(v).strip())
            except Exception:
                pass
        # 2) TITLE에서 fallback
        t = title_fallback if title_fallback is not None else _get_case(params, 'TITLE')
        if isinstance(t, (list, tuple)):
            t = t[0] if t else None
        if isinstance(t, str):
            m = _scan_pat_title.search(t)
            if m:
                for g in m.groups():
                    if g is not None:
                        return int(g)
            m2 = _index_pat_title.search(t)  # scan이 없으면 index라도
            if m2:
                return int(m2.group(1))
        return None

    def _extract_rt_seconds(params):
        for k in ('RTINSECONDS', 'RTINSEC', 'rtinseconds', 'rtinsec'):
            v = _get_case(params, k)
            if v is None:
                continue
            if isinstance(v, (list, tuple)) and v:
                try:
                    return float(str(v[0]).strip())
                except Exception:
                    continue
            try:
                return float(str(v).strip())
            except Exception:
                continue
        return None

    def _attach_row(row):
        rid = row.get("ms_run_id")
        idx = row.get("mgf_index")
        if pd.isna(rid) or pd.isna(idx):
            return pd.Series([None, None, None, None])
        full = msrun_to_full.get(int(rid))
        if not full:
            return pd.Series([None, None, None, None])

        info = picked.get((full, int(idx)))
        params = info.get("params") if isinstance(info, dict) else None
        if not isinstance(params, dict):
            return pd.Series([os.path.basename(full), full, None, None])

        title = _get_case(params, 'TITLE')
        scan  = _extract_scan(params, title_fallback=title)
        rt    = _extract_rt_seconds(params)
        return pd.Series([os.path.basename(full), full, scan, rt])

    df[["mgf_file", "mgf_fullpath", "scan", "rt_seconds"]] = df.apply(_attach_row, axis=1)
    df["rt_minutes"] = df["rt_seconds"].apply(lambda x: (x/60.0) if pd.notna(x) else None)
    return df


def get_feauters_df(result_file,mgf_dir, pattern):
    
    run_pat   = re.compile(r'ms_run\[(\d+)\]')
    index_pat = re.compile(r'index=(\d+)')
    
    def parse_msrun(s):
        if not isinstance(s, str): return None
        m = run_pat.search(s)
        return int(m.group(1)) if m else None

    def parse_index(s):
        if not isinstance(s, str): return None
        m = index_pat.search(s)
        return int(m.group(1)) if m else None
    
    
    psm_df = read_mztab_psm(result_file)
    
    cols = [
        'sequence',              
        'spectra_ref',          
        'search_engine_score[1]',
        'charge', 
        'exp_mass_to_charge'
    ]
    existing = [c for c in cols if c in psm_df.columns]
    psm_df = psm_df[existing].copy()   
    
    if 'spectra_ref' in psm_df.columns:
        psm_df['ms_run_id'] = psm_df['spectra_ref'].apply(parse_msrun)
        psm_df['mgf_index'] = psm_df['spectra_ref'].apply(parse_index)
    else:
        psm_df['ms_run_id'] = pd.NA
        psm_df['mgf_index'] = pd.NA 
    
    msrun_to_path = read_mztab_msrun_locations(result_file)
    
    mgf_files = glob.glob(os.path.join(mgf_dir, "*.mgf")) + glob.glob(os.path.join(mgf_dir, "*.MGF"))
    base_to_full = {os.path.basename(p): os.path.abspath(p) for p in mgf_files}

    msrun_to_full = {}
    for rid, loc in msrun_to_path.items():
        base = os.path.basename(loc.replace("file://",""))
        msrun_to_full[rid] = base_to_full.get(base)
    
    
    need = {}
    for _, row in psm_df.dropna(subset=["ms_run_id","mgf_index"]).iterrows():
        rid, idx = int(row["ms_run_id"]), int(row["mgf_index"])
        full = msrun_to_full.get(rid)
        if full:
            need.setdefault(full, set()).add(idx)

    # 필요한 스펙트럼만 추출
    picked = {}
    for full, idx_set in need.items():
        with mgf.MGF(full) as r:
            for i, spec in enumerate(r):
                if i in idx_set:
                    picked[(full, i)] = spec  # params, m/z array, intensity array
                    

    psm_df = attach_mgf_metadata(psm_df, picked, msrun_to_full)
    
    psm_df = psm_df.rename(columns={
        'sequence':'Peptide',
        'search_engine_score[1]':'Casanovo score',
        'charge':'z',
        'exp_mass_to_charge':'m/z',
        'rt_seconds':'RT',
        'scan':'Scan',
        'mgf_file':'run'
    })
    psm_df['z'] = pd.to_numeric(psm_df['z'], errors='coerce')
    psm_df['SS'] = psm_df.apply(lambda x:get_ss(x['Scan'],x['run']),axis=1)
    print("PSM rows:", len(psm_df))
    
    pd_df = get_casanovo_changed_df(psm_df)

    pd_rank1_df = pd_df[pd_df['rank_first']==1.0]
    print("Rank1 PSM rows:",len(pd_rank1_df))
    
    pd_rank1_pep_df = pd_rank1_df.drop_duplicates(subset=['peptide'],keep='first')
    print("Rank1 peptide rows:",len(pd_rank1_pep_df))

    pd_psm_list = PSMList(psm_list=[])
    
    for _, row in pd_rank1_df.iterrows():
        psm = PSM(
            spectrum_id=str(row["Scan"]),
            run=str(row['run']),
            peptidoform=str(row["peptidoform"]),
            score=float(row["Casanovo score"]),
            retention_time=float(row['RT']),
            is_decoy=False,
            precursor_mz=float(row["m/z"]),
            charge=int(row["z"]),
            protein_list=None,
            rank=1
        )
        pd_psm_list.psm_list.append(psm)
    
    
    pd_psm_list.rename_modifications({
        "gl": "Gln->pyro-Glu",
        "ox": "Oxidation",
        "ac": "Acetylation",
        "de": "Deamidation",
        "ca": "Carbamylation",
        "al": "Ammonia-loss"       
    })
    pd_psm_list.add_fixed_modifications([("U:Carbamidomethyl", ["C"])])
    pd_psm_list.apply_fixed_modifications()

    
    # general feateures
    basic_fgen = BasicFeatureGenerator()
    basic_fgen.add_features(pd_psm_list)

    # cosine similarity
    ms2pip_fgen = MS2PIPFeatureGenerator(
        model="HCD",
        ms2_tolerance=0.02,
        spectrum_path=mgf_dir,
        spectrum_id_pattern=pattern,
        processes=1,
    )
    ms2pip_fgen.add_features(pd_psm_list)

    # deepLC
    deeplc_fgen = DeepLCFeatureGenerator(
        lower_score_is_better=False,
        calibration_set_size=0.15,
        spectrum_path=None,
        processes=1,
        deeplc_retrain=False,
    )
    deeplc_fgen.add_features(pd_psm_list)

    fea_df = psm_list_to_df(pd_psm_list,pd_rank1_df)
    print("Finally PSM rows:", len(fea_df))

    return fea_df


def get_finally_save_csv(pd_df,flag):
    pd_tmp = pd_df[pd_df['Casanovo score']>=0]
    print("Casanovo score >=0 rows: ",len(pd_tmp))
    pd_tmp['Label'] = flag
    pd_tmp['Proteins'] = 1
    
    pd_tmp = pd_tmp.rename(columns={'rt_diff':'absdRT','abs_ms1_error_ppm':'absdMppm','spectrum_id':'ScanNr'})
    pd_tmp = pd_tmp[['SS','Label','ScanNr','SA','absdRT','absdMppm','Peptide','Proteins','z']]
    
    return pd_tmp

def percolator_dm_alc_output(t_df,d_df,output_dir):
    t_df['SpecId'] = t_df.apply(lambda x: combine_columns([x['SS'],x['z']],'_'),axis=1)
    d_df['SpecId'] = d_df.apply(lambda x: combine_columns([x['SS'],x['z']],'_'),axis=1)

    all_df = pd.concat([t_df,d_df])
    
    f = open(os.path.join(output_dir,'t_d.pin'),'w',newline='')
    wr = csvs.writer(f,delimiter='\t')
    wr.writerow(['SpecId','Label','ScanNr','SA','absdRT','absdMppm','Peptide','Proteins'])
    for idx,row in all_df.iterrows():
        wr.writerow([row['SpecId'],str(row['Label']),row['ScanNr'],row['SA'],row['absdRT'],row['absdMppm'],row['Peptide'],row['Proteins']])
    f.close()
    
    
if __name__ == "__main__":
    
    parser = argparse.ArgumentParser(description="parameters")
    parser.add_argument("--target_mgf_dir", type=str, required=True, help="target mgf directory")
    parser.add_argument("--target_result_path", type=str, required=True, help="target casanovo result path")
    parser.add_argument("--decoy_mgf_dir", type=str, required=True, help="decoy mgf directory")
    parser.add_argument("--decoy_result_path", type=str, required=True, help="decoy casanovo result path")
    parser.add_argument("--output_dir", type=str, required=True, help="output directory")
    args = parser.parse_args()
    print(args)

    os.makedirs(args.output_dir, exist_ok=True)

    print("start target...")
    t_pd_df = get_feauters_df(args.target_result_path, args.target_mgf_dir, r'NativeID:".*scan=(\d+)')
    t_pd_df.to_csv(os.path.join(args.output_dir, 'all_target_features_df.csv'), index=False)
    

    print("start decoy...")
    d_pd_df = get_feauters_df(args.decoy_result_path, args.decoy_mgf_dir, r'NativeID:".*scan=(\d+)')
    d_pd_df.to_csv(os.path.join(args.output_dir, 'all_decoy_features_df.csv'), index=False)
    
    print("start percolator input generation")
   
    t_pd_tmp = get_finally_save_csv(t_pd_df,1)
    d_pd_tmp = get_finally_save_csv(d_pd_df,-1)
    
    percolator_dm_alc_output(t_pd_tmp,d_pd_tmp,args.output_dir)

    print("all done.")

        
