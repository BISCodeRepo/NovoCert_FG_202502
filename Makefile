# NovoCert Makefile
#
# 버전 관리:
#   make bump VERSION=1.2.5          # 모든 파일의 버전 일괄 업데이트
#
# GitHub Release 업로드:
#   make release-upload              # package.json 버전 사용
#   make release-upload VERSION=1.2.5
#   make release-upload VERSION=1.2.5 NOTES=changelog.md
#
# 전제 (release-upload):
#   - gh 설치 및 gh auth login 완료
#   - electron/release/$(VERSION)/ 에 빌드 산출물이 이미 있음

.PHONY: help bump release-upload check-gh check-artifacts

# 기본값: electron/package.json 의 version 필드
VERSION ?= $(shell node -p "require('./electron/package.json').version" 2>/dev/null)
TAG := v$(VERSION)

ELECTRON_DIR := electron
RELEASE_DIR := $(ELECTRON_DIR)/release/$(VERSION)
WIN_EXE := $(RELEASE_DIR)/NovoCert-Windows-$(VERSION)-x64-Setup.exe
MAC_DMG := $(RELEASE_DIR)/NovoCert-Mac-$(VERSION)-universal.dmg

# 선택: 릴리스 노트 파일 (없으면 --generate-notes)
NOTES ?=

help:
	@echo "사용 가능한 타겟:"
	@echo ""
	@echo "  make bump VERSION=x.y.z          # 버전 일괄 업데이트 (package.json + README)"
	@echo ""
	@echo "  make release-upload              # VERSION = electron/package.json"
	@echo "  make release-upload VERSION=x.y.z"
	@echo "  make release-upload VERSION=x.y.z NOTES=RELEASE_NOTES.md"
	@echo ""
	@echo "산출물 기대 경로:"
	@echo "  $(WIN_EXE)"
	@echo "  $(MAC_DMG)"

# 버전 일괄 업데이트
# 사용법: make bump VERSION=1.2.5
bump:
	@test -n "$(VERSION)" || { echo "VERSION 을 지정하세요. 예: make bump VERSION=1.2.5"; exit 1; }
	@OLD_VERSION=$$(node -p "require('./electron/package.json').version"); \
	echo "$$OLD_VERSION → $(VERSION)"; \
	cd electron && npm version "$(VERSION)" --no-git-tag-version; \
	cd ..; \
	sed -i '' "s/$$OLD_VERSION/$(VERSION)/g" README.md; \
	sed -i '' "s/$$OLD_VERSION/$(VERSION)/g" electron/README.md; \
	echo "완료: electron/package.json, README.md, electron/README.md 업데이트"
	@echo "Header.tsx 버전은 빌드 시 자동 반영됩니다 (__APP_VERSION__)."

check-gh:
	@command -v gh >/dev/null 2>&1 || { echo "gh 가 없습니다. https://cli.github.com"; exit 1; }
	@gh auth status >/dev/null 2>&1 || { echo "gh auth login 을 먼저 실행하세요."; exit 1; }

check-artifacts:
	@test -n "$(VERSION)" || { echo "VERSION 이 비어 있습니다."; exit 1; }
	@test -f "$(WIN_EXE)" || { echo "파일이 없습니다: $(WIN_EXE)"; exit 1; }
	@test -f "$(MAC_DMG)" || { echo "파일이 없습니다: $(MAC_DMG)"; exit 1; }

release-upload: check-gh check-artifacts
	@echo "Release tag: $(TAG)"
	@if gh release view "$(TAG)" >/dev/null 2>&1; then \
		echo "기존 릴리스에 에셋 업로드 (clobber)..."; \
		gh release upload "$(TAG)" "$(WIN_EXE)" "$(MAC_DMG)" --clobber; \
	else \
		echo "새 릴리스 생성 + 에셋 업로드..."; \
		if [ -n "$(NOTES)" ] && [ -f "$(NOTES)" ]; then \
			gh release create "$(TAG)" "$(WIN_EXE)" "$(MAC_DMG)" --title "$(TAG)" --notes-file "$(NOTES)"; \
		else \
			gh release create "$(TAG)" "$(WIN_EXE)" "$(MAC_DMG)" --title "$(TAG)" --generate-notes; \
		fi; \
	fi
	@echo "완료: https://github.com/$$(gh repo view --json nameWithOwner -q .nameWithOwner)/releases/tag/$(TAG)"
