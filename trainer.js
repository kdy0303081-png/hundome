
        /* ===================================================================
           NAVIGATION / MODULE SWITCHING LOGIC
           =================================================================== */
        function switchModule(moduleName) {
            const modules = ['dialog', 'speech', 'message'];
            if (!modules.includes(moduleName)) moduleName = 'dialog';
            if (location.hash !== '#' + moduleName) history.replaceState(null, '', '#' + moduleName);
            const names = { dialog: '귀 · 대화', message: '눈 · 문자', speech: '입 · 스피치' };
            document.title = names[moduleName] + ' | 말의 기술';
            document.body.dataset.module = moduleName;
            if (window.conversationExperience) window.conversationExperience.setActive(moduleName === 'dialog');
            if (moduleName !== 'dialog' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
            if (moduleName !== 'speech' && typeof closeTeleprompter === 'function') closeTeleprompter();
            modules.forEach(m => {
                const modEl = document.getElementById(`module-${m}`);
                const btnEl = document.getElementById(`tab-${m}`);
                if (modEl && btnEl) {
                    modEl.setAttribute('aria-hidden', String(m !== moduleName));
                    btnEl.setAttribute('aria-pressed', String(m === moduleName));
                    if (m === moduleName) {
                        modEl.classList.remove('hidden');
                        btnEl.className = "nav-btn px-4 py-2 rounded-xl text-white bg-indigo-600/40 border border-indigo-500/50 shadow-sm flex items-center gap-2";
                    } else {
                        modEl.classList.add('hidden');
                        btnEl.className = "nav-btn px-4 py-2 rounded-xl text-slate-300 hover:text-white transition flex items-center gap-2";
                    }
                }
            });
        }

        /* ===================================================================
           MODULE 2: 스피치 (SPEECH & TELEPROMPTER) LOGIC
           =================================================================== */
        let prompterInterval = null;
        let isPrompterPlaying = false;

        function loadSampleSpeechScript() {
            const sampleScript = `안녕하십니까, 오늘 여러분께 👀 [아이컨택] '오해 없는 소통의 힘'에 대해 말씀드릴 김소통입니다.

⏸️ [잠시 멈춤 2초]

우리는 하루에도 수백 번 대화를 나누지만, ✋ [손짓: 펼치기] 정작 서로의 진짜 의도를 이해하는 경우는 얼마나 될까요? 🔊 [목소리 톤UP]

중요한 것은 단순히 말을 전달하는 것이 아니라, ✊ [손짓: 주먹/강조] 마음을 전달하는 것입니다. 😊 [밝은 미소]

오늘 이 시간을 통해 여러분의 커뮤니케이션이 더욱 깊어지길 진심으로 바랍니다. 👀 [아이컨택] 감사합니다.`;
            
            const editor = document.getElementById('speech-script-editor');
            if (editor) {
                editor.value = sampleScript;
                updateSpeechAnalysis();
            }
        }

        function insertGestureTag(tagWithEmoji) {
            const editor = document.getElementById('speech-script-editor');
            if (!editor) return;

            const startPos = editor.selectionStart;
            const endPos = editor.selectionEnd;
            const text = editor.value;

            editor.value = text.substring(0, startPos) + tagWithEmoji + text.substring(endPos);
            editor.focus();
            editor.selectionStart = startPos + tagWithEmoji.length;
            editor.selectionEnd = startPos + tagWithEmoji.length;

            updateSpeechAnalysis();
        }

        function updateSpeechAnalysis() {
            const editor = document.getElementById('speech-script-editor');
            if (!editor) return;

            const val = editor.value;
            const charCount = val.length;
            document.getElementById('script-char-count').innerText = `${charCount}자 작성됨`;

            // Regex matches both emoji tags like "✋ [손짓: 펼치기]" or standard "[...]" tags
            const tagRegex = /(?:[^\s\[\]\w\d_]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF])?\s*\[(.*?)\]/g;
            const matches = val.match(tagRegex) || [];
            document.getElementById('stat-tag-count').innerText = `${matches.length}개`;

            let pauseSeconds = 0;
            matches.forEach(t => {
                if (t.includes('멈춤') || t.includes('⏸️')) {
                    const secMatch = t.match(/\d+/);
                    if (secMatch) pauseSeconds += parseInt(secMatch[0]);
                    else pauseSeconds += 2;
                }
            });

            const pureText = val.replace(tagRegex, '');
            const speakSeconds = Math.ceil((pureText.length / 300) * 60) + pauseSeconds;
            const mins = String(Math.floor(speakSeconds / 60)).padStart(2, '0');
            const secs = String(speakSeconds % 60).padStart(2, '0');
            document.getElementById('stat-est-time').innerText = `${mins}:${secs}`;

            const tagCounts = {};
            matches.forEach(t => {
                const cleanTag = t.trim();
                tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
            });

            const breakdownContainer = document.getElementById('tag-breakdown-list');
            if (breakdownContainer) {
                if (matches.length === 0) {
                    breakdownContainer.innerHTML = `<span class="text-slate-500 text-xs italic">태그를 추가하면 여기에 구성비가 표시됩니다.</span>`;
                } else {
                    breakdownContainer.innerHTML = Object.entries(tagCounts).map(([tag, count]) => `
                        <span class="bg-indigo-950 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-lg text-[11px] font-semibold flex items-center gap-1">
                            <span>${tag}</span> <span class="text-indigo-400 font-bold ml-1">x${count}</span>
                        </span>
                    `).join('');
                }
            }
        }

        function startTeleprompter() { window.speechPrompter.start(); }
        function togglePrompterPlay() { window.speechPrompter.toggle(); }
        function closeTeleprompter() { window.speechPrompter.close(); }

        /* ===================================================================
           MODULE 3: 문자 (CUSTOM INTENT MESSAGE BUILDER) LOGIC
           =================================================================== */
        function clearCustomFields() {
            document.getElementById('input-situation').value = '';
            document.getElementById('input-emotion').value = '';
            document.getElementById('input-reason').value = '';
            document.getElementById('input-request').value = '';
            updateAssembledText();
        }

        function updateAssembledText() {
            const sit = document.getElementById('input-situation').value.trim();
            const emo = document.getElementById('input-emotion').value.trim();
            const rea = document.getElementById('input-reason').value.trim();
            const req = document.getElementById('input-request').value.trim();

            updateDiagBadge('diag-sit', sit);
            updateDiagBadge('diag-emo', emo);
            updateDiagBadge('diag-rea', rea);
            updateDiagBadge('diag-req', req);

            const parts = [];
            if (sit) parts.push(sit);
            if (emo) parts.push(emo);
            if (rea) parts.push(rea);
            if (req) parts.push(req);

            let result = "";
            if (parts.length === 0) {
                result = "입력 말풍선에 내용을 적으면 메시지가 완성돼요.";
            } else {
                result = parts.join(" ");

            }

            document.getElementById('assembled-text-output').innerText = result;
            document.getElementById('char-counter').innerText = `${parts.length ? result.length : 0}자`;
        }

        function updateDiagBadge(id, value) {
            const el = document.getElementById(id);
            if (!el) return;
            if (value) {
                el.innerText = "포함";
                el.className = "font-bold text-emerald-400";
            } else {
                el.innerText = "미입력";
                el.className = "font-bold text-slate-500";
            }
        }

        function copyAssembledText() {
            const text = document.getElementById('assembled-text-output').innerText;
            if (!text) return;

            const tempInput = document.createElement('textarea');
            tempInput.value = text;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);

            const toast = document.getElementById('toast-message');
            if (toast) {
                toast.classList.remove('hidden');
                setTimeout(() => {
                    toast.classList.add('hidden');
                }, 2500);
            }
        }

        window.addEventListener('hashchange', () => switchModule(location.hash.slice(1)));
        window.addEventListener('pagehide', () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); });
        window.onload = function() {
            switchModule(location.hash.slice(1) || 'dialog');

            updateSpeechAnalysis();
            clearCustomFields();
        };
    