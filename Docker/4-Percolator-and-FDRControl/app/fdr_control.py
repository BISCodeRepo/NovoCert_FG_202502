import pandas as pd
import re
import argparse
import os

def combine_columns(col_list,separate):
    result = col_list[0]
    for col in col_list[1:]:
        if not pd.isna(col):
            result += separate + str(col)
    return result


def change_percolator_peptide(pep):
    result = pep
    result = result.replace('I','L')
    result = re.sub('[^a-zA-Z]', '', result)
    return result
    

def change_percolator_df(tmp_df,col_1,col_2):
    tmp_df['pep'] = tmp_df.apply(lambda x: change_percolator_peptide(x[col_2]), axis=1)
    tmp_df['ID'] = tmp_df.apply(lambda x: combine_columns([x[col_1],x['pep']],'_'), axis=1)
    return tmp_df


def make_fdr(peaks_tmp,fdr_val):
    """FDR 하기
    Args:
        target_df (_type_): target dataframe
        decoy_df (_type_): decoy dataframe
        fdr_val (_type_): fdr 값
        
    Returns:
        _type_: fdr 결과 반환
    """
    #fdr 진행
    T = 0
    D = 0
    fdr_list = []
    for idx,row in peaks_tmp.iterrows():
        if row['label'] == 1:
            T = T + 1
        else:
            D = D + 1
            
        if D/T <= fdr_val:
            fdr_list.append(idx-1)
    
    #print(fdr_list)
    
    last_index = fdr_list[-1]
    print('last_index = '+str(last_index))
    result_file = peaks_tmp.head(last_index)
    
    return result_file,last_index


def peptide_fdr(target_path,decoy_path,fdr_rate):
    
    
    t_df = pd.read_csv(target_path,sep='\t')
    t_df['PSMId'] = t_df['PSMId'].apply(lambda x:x[0:x.rfind('_')])
    t_df = change_percolator_df(t_df,'PSMId','peptide')
    
    d_df = pd.read_csv(decoy_path,sep='\t')
    d_df['PSMId'] = d_df['PSMId'].apply(lambda x:x[0:x.rfind('_')])
    d_df = change_percolator_df(d_df,'PSMId','peptide')
    
    t_df['label']=1
    d_df['label']=-1
    ori_df = pd.concat([t_df,d_df])

    ori_df['rank_scan'] = ori_df.groupby(['PSMId'])['score'].rank(method='first', ascending=False)
    ori_scan_df = ori_df[ori_df['rank_scan']==1.0]

    ori_scan_df['rank_first'] = ori_scan_df.groupby(['pep'])['score'].rank(method='first', ascending=False)
    ori_pep_df = ori_scan_df[ori_scan_df['rank_first']==1.0]
    #print(len(ori_pep_df))

    ori_df['rank_first'] = ori_df.groupby(['pep'])['score'].rank(method='first', ascending=False)
    ori_pep_df = ori_df[ori_df['rank_first']==1.0]
    #print(len(ori_pep_df))
    
    ori_sort = ori_pep_df.sort_values(by=['score','label'],ascending=[False,False])
    ori_sort.reset_index(inplace=True,drop=True)

    fdr_df,_ = make_fdr(ori_sort,fdr_rate)
    min_score = fdr_df['score'].min()
    #print(min_score)

    fdr_pep_df = ori_df.loc[ori_df['pep'].isin(fdr_df['pep'])].copy()
    #print(len(fdr_pep_df))
    
    fdr_t_df = fdr_pep_df[(fdr_pep_df['label'] == 1) & (fdr_pep_df['score'] >= min_score)]
    print("After Peptide FDR estimated, PSM rows: ",len(fdr_t_df))

    fdr_t_df['IDD'] = fdr_t_df.apply(lambda x: combine_columns([x['PSMId'],x['peptide']],'_'), axis=1)
    

    return fdr_t_df


def psm_fdr(target_path,decoy_path,fdr_rate):
    t_df = pd.read_csv(target_path,sep='\t')
    t_df['PSMId'] = t_df['PSMId'].apply(lambda x:x[0:x.rfind('_')])
    t_df = change_percolator_df(t_df,'PSMId','peptide')
    
    d_df = pd.read_csv(decoy_path,sep='\t')
    d_df['PSMId'] = d_df['PSMId'].apply(lambda x:x[0:x.rfind('_')])
    d_df = change_percolator_df(d_df,'PSMId','peptide')
    
    t_df['label']=1
    d_df['label']=-1
    ori_df = pd.concat([t_df,d_df])

    ori_df['rank_scan'] = ori_df.groupby(['PSMId'])['score'].rank(method='first', ascending=False)
    ori_scan_df = ori_df[ori_df['rank_scan']==1.0]
    
    ori_sort = ori_scan_df.sort_values(by=['score','label'],ascending=[False,False])
    ori_sort.reset_index(inplace=True,drop=True)

    fdr_df,_ = make_fdr(ori_sort,fdr_rate)
    min_score = fdr_df['score'].min()
    #print(min_score)

    fdr_t_df = fdr_df[fdr_df['label']==1]
    fdr_t_df['IDD'] = fdr_t_df.apply(lambda x: combine_columns([x['PSMId'],x['peptide']],'_'), axis=1)
    
    print("After PSM FDR estimated, PSM rows: ",len(fdr_t_df))
    
    return fdr_t_df


def estimate_fdr(fdr_type,target_path,decoy_path,fdr,output_fdr):
    
    fdr = float(fdr)
    
    if fdr_type == 'peptide': #peptide fdr
        fdr_df = peptide_fdr(target_path,decoy_path,fdr)
        fdr_df.to_csv(os.path.join(output_fdr, 'fdr_result.csv'), index=False)
    else: # psm fdr
        fdr_df = psm_fdr(target_path,decoy_path,fdr)
        fdr_df.to_csv(os.path.join(output_fdr, 'fdr_result.csv'), index=False)



if __name__ == "__main__":
    
    parser = argparse.ArgumentParser(description="parameters")
    parser.add_argument("--fdr_type", type=str, required=True, help="FDR type")
    parser.add_argument("--target_path", type=str, required=True, help="percolator target result path")
    parser.add_argument("--decoy_path", type=str, required=True, help="percolator decoy mgf path")
    parser.add_argument("--fdr_rate", type=str, required=True, help="FDR rate")
    parser.add_argument("--output_dir", type=str, required=True, help="output directory")
    args = parser.parse_args()
    print(args)

    os.makedirs(args.output_dir, exist_ok=True)

    print("start FDR estimation...")
    
    estimate_fdr(args.fdr_type,args.target_path,args.decoy_path,args.fdr_rate,args.output_dir)

    print("all done.")