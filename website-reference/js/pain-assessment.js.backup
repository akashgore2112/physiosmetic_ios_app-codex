/**
 * Pain Assessment AI Module
 * Production-ready modular implementation
 */

// Initialize the module
export function initPainAssessment() {
    console.log('🚀 Initializing Pain Assessment AI Module...');

    // Check if TRANSLATIONS is loaded
    if (typeof window.TRANSLATIONS === 'undefined') {
        console.error('❌ TRANSLATIONS not loaded! Make sure translations.js is included before this script.');
        return;
    }

    console.log('✅ TRANSLATIONS loaded successfully');
    console.log('✅ Available languages:', Object.keys(window.TRANSLATIONS));

    // Initialize language system
    initializeLanguageSystem();

    console.log('✅ Pain Assessment AI Module initialized successfully');
}

        // STATE MANAGEMENT
        let assessmentData = {
            bodyPart: null,  // Keep for backward compatibility (first selected part)
            selectedParts: [],  // NEW: Track multiple selected body parts
            intensity: null,
            intensityLabel: 'moderate',
            duration: null,
            activities: [],
            painFrequency: '',
            painType: '',
            durationMonths: 3,
            activityTriggers: [],
            additionalNotes: '',
            currentStep: 1,
            totalSteps: 4,
            currentLanguage: 'en',
            voiceEnabled: false,
            gender: 'male',
            sessionId: generateSessionId(),
            timestamp: new Date().toISOString(),
            aiResponse: null,
            aiMessages: []
        };

        // TRANSLATIONS SYSTEM - Loaded from external translations.js file
        // TRANSLATIONS object is now available globally

        /**
         * SIMPLIFIED LANGUAGE SYSTEM
         * - Two fixed languages: English, Hindi
         * - No third regional language
         * - Translations generated on-demand when user switches language
         * - Clean and reliable
         */
        let regionalLanguage = null;  // No third language
        let regionalLanguageName = '';  // No regional button

        // Language names mapping for readable labels
        const LANGUAGE_NAMES = {
            'en': 'English',
            'hi': 'हिंदी',
            'mr': 'मराठी',
            'ta': 'தமிழ்',
            'gu': 'ગુજરાતી',
            'kn': 'ಕನ್ನಡ',
            'te': 'తెలుగు',
            'bn': 'বাংলা',
            'ml': 'മലയാളം',
            'pa': 'ਪੰਜਾਬੀ',
            'ar': 'العربية',
            'es': 'Español',
            'fr': 'Français',
            'de': 'Deutsch',
            'pt': 'Português',
            'ru': 'Русский',
            'zh': '中文',
            'ja': '日本語',
            'ko': '한국어'
        };

        /**
         * REMOVED: Complex IP-based language detection
         * Now using simple fixed languages: EN, HI, MR
         * Users can manually switch between them as needed
         */

        /**
         * TRANSLATION CACHE - Store translations in localStorage
         */
        function getCachedTranslation(text, lang) {
            try {
                const cacheKey = `trans_${lang}_${text.substring(0, 50)}`; // Use first 50 chars for key
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    return cached;
                }
            } catch (err) {
                // Ignore cache errors
            }
            return null;
        }

        function setCachedTranslation(text, lang, translation) {
            try {
                const cacheKey = `trans_${lang}_${text.substring(0, 50)}`;
                localStorage.setItem(cacheKey, translation);
            } catch (err) {
                // Ignore cache errors (quota exceeded, etc.)
            }
        }

        /**
         * HYBRID TRANSLATION ENGINE with Caching & Smart Fallback
         * 1. Check localStorage cache first
         * 2. Try DeepL (if supported and key configured)
         * 3. Try MyMemory primary endpoint
         * 4. Try MyMemory alternative endpoint on rate limit
         * 5. Return English as final fallback
         */
        /**
         * Translate using Google Translate API (optional fast path)
         */
        async function translateTextGoogle(text, targetLang) {
            const googleKey = localStorage.getItem('google_translate_api_key');
            if (!googleKey) return null;

            try {
                const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${googleKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        q: text,
                        target: targetLang,
                        source: 'en'
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.data && data.data.translations && data.data.translations[0]) {
                        return data.data.translations[0].translatedText;
                    }
                }
            } catch (err) {
                // Silent fail
            }
            return null;
        }

        /**
         * ULTRA-FAST Translation with retry logic (2× retry, 300ms gap)
         */
        async function translateTextSmart(text, targetLang, maxRetries = 2) {
            // Check cache first (instant!)
            const cached = getCachedTranslation(text, targetLang);
            if (cached) {
                return cached;
            }

            const deeplKey = localStorage.getItem('deepl_api_key');
            const googleKey = localStorage.getItem('google_translate_api_key');

            // DeepL supported languages (API doesn't support Arabic, Hindi, Chinese, etc.)
            const deeplSupported = ['de', 'es', 'fr', 'it', 'pt', 'nl', 'pl', 'ru', 'tr', 'bg', 'cs', 'da', 'el', 'et', 'fi', 'hu', 'id', 'lt', 'lv', 'ro', 'sk', 'sl', 'sv', 'uk', 'nb'];
            const isDeeplSupported = deeplSupported.includes(targetLang.toLowerCase());

            // Try Google Translate first if available (fastest!)
            if (googleKey) {
                const googleResult = await translateTextGoogle(text, targetLang);
                if (googleResult) {
                    setCachedTranslation(text, targetLang, googleResult);
                    return googleResult;
                }
            }

            // Try DeepL for supported languages
            if (deeplKey && isDeeplSupported) {
                for (let retry = 0; retry < maxRetries; retry++) {
                    try {
                        const response = await fetch('https://api-free.deepl.com/v2/translate', {
                            method: 'POST',
                            headers: {
                                'Authorization': `DeepL-Auth-Key ${deeplKey}`,
                                'Content-Type': 'application/x-www-form-urlencoded'
                            },
                            body: `text=${encodeURIComponent(text)}&target_lang=${targetLang.toUpperCase()}`
                        });

                        if (response.ok) {
                            const data = await response.json();
                            if (data.translations && data.translations[0] && data.translations[0].text) {
                                const translated = data.translations[0].text;
                                if (translated !== text) {
                                    setCachedTranslation(text, targetLang, translated);
                                    return translated;
                                }
                            }
                        }
                        // If DeepL returns empty or same text, immediately fall through to MyMemory
                        break;
                    } catch (err) {
                        if (retry < maxRetries - 1) {
                            await new Promise(resolve => setTimeout(resolve, 300));
                        }
                    }
                }
            }

            // MyMemory API with smart endpoint fallback and retry (300ms delay)
            const myMemoryEndpoints = [
                'https://api.mymemory.translated.net/get',
                'https://translated-mymemory---api.herokuapp.com/get'
            ];

            for (const endpoint of myMemoryEndpoints) {
                for (let retry = 0; retry < maxRetries; retry++) {
                    try {
                        const url = `${endpoint}?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
                        const response = await fetch(url);

                        if (response.status === 429 && retry < maxRetries - 1) {
                            await new Promise(resolve => setTimeout(resolve, 300));
                            continue;
                        }

                        if (response.ok) {
                            const data = await response.json();
                            if (data.responseData && data.responseData.translatedText) {
                                const translated = data.responseData.translatedText;
                                setCachedTranslation(text, targetLang, translated);
                                return translated;
                            }
                        }
                        break;
                    } catch (err) {
                        if (retry < maxRetries - 1) {
                            await new Promise(resolve => setTimeout(resolve, 300));
                        }
                    }
                }
            }

            // Final fallback - return original English text
            return text;
        }

        /**
         * TASK POOL LIMITER - Manages max 5 concurrent API calls
         * Prevents browser throttling and keeps UI responsive
         */
        /**
         * STREAMING TRANSLATION QUEUE
         * - Async generator that yields results as they complete
         * - Max 5 concurrent API calls with backpressure
         * - Non-blocking, real-time progress updates
         * - Smooth progress animation via requestAnimationFrame
         */
        async function* streamingTranslationQueue(tasks, limit = 5) {
            const executing = new Set();
            const taskIterator = tasks[Symbol.iterator]();
            let completedCount = 0;

            // Start initial batch
            while (executing.size < limit) {
                const { value: task, done } = taskIterator.next();
                if (done) break;

                const promise = (async () => {
                    try {
                        const result = await task();
                        return { success: true, result };
                    } catch (error) {
                        return { success: false, error };
                    }
                })();

                // Track with cleanup
                promise.finally(() => executing.delete(promise));
                executing.add(promise);
            }

            // Stream results as they complete
            while (executing.size > 0) {
                const completed = await Promise.race(executing);
                completedCount++;

                // Yield result immediately for smooth progress
                yield { ...completed, completedCount };

                // Start next task if available
                const { value: nextTask, done } = taskIterator.next();
                if (!done) {
                    const promise = (async () => {
                        try {
                            const result = await nextTask();
                            return { success: true, result };
                        } catch (error) {
                            return { success: false, error };
                        }
                    })();

                    promise.finally(() => executing.delete(promise));
                    executing.add(promise);
                }
            }
        }

        /**
         * ULTRA-SMOOTH PROGRESS ANIMATOR
         * - Uses requestAnimationFrame for 60fps updates
         * - Smooth interpolation to target progress
         * - No chunky jumps
         */
        class SmoothProgressAnimator {
            constructor(callback) {
                this.callback = callback;
                this.currentProgress = 0;
                this.targetProgress = 0;
                this.animating = false;
                this.rafId = null;
            }

            setTarget(progress) {
                this.targetProgress = Math.min(100, Math.max(0, progress));
                if (!this.animating) {
                    this.startAnimation();
                }
            }

            startAnimation() {
                this.animating = true;
                const animate = () => {
                    // Smooth interpolation (ease-out)
                    const diff = this.targetProgress - this.currentProgress;
                    if (Math.abs(diff) < 0.1) {
                        this.currentProgress = this.targetProgress;
                        this.callback(Math.round(this.currentProgress));
                        this.animating = false;
                        return;
                    }

                    this.currentProgress += diff * 0.2; // Smooth easing
                    this.callback(Math.round(this.currentProgress));
                    this.rafId = requestAnimationFrame(animate);
                };
                this.rafId = requestAnimationFrame(animate);
            }

            complete() {
                this.setTarget(100);
                if (this.rafId) {
                    cancelAnimationFrame(this.rafId);
                }
            }
        }

        /**
         * STREAMING TRANSLATION ENGINE
         * - Yields results as they complete (not waiting for all)
         * - Smooth 60fps progress animation
         * - Max 5 concurrent API calls
         * - Completes in <5 seconds for ~130 strings
         */
        async function generateDynamicTranslation(langCode, progressCallback) {
            const startTime = Date.now();
            const hasGoogle = localStorage.getItem('google_translate_api_key');
            const hasDeepL = localStorage.getItem('deepl_api_key');
            const languageName = getLanguageName(langCode);

            console.log(`🚀 STREAMING translation for: ${languageName} (${langCode})`);
            if (hasGoogle) {
                console.log('⚡ Using Google Translate API (fastest!)');
            } else if (hasDeepL) {
                console.log('⚡ Using DeepL API with MyMemory fallback');
            } else {
                console.log('🌍 Using MyMemory API (free)');
            }

            try {
                // Get English translations as base
                const englishTranslations = typeof TRANSLATIONS !== 'undefined' ? TRANSLATIONS.en : {};

                if (!englishTranslations || Object.keys(englishTranslations).length === 0) {
                    console.error('❌ No English translations found as base');
                    return null;
                }

                const keys = Object.keys(englishTranslations);
                const totalKeys = keys.length;

                console.log(`⚡ Starting streaming queue (max 5 concurrent)...`);
                console.log(`📝 Total: ${totalKeys} strings to translate`);

                const translated = {};

                // Setup smooth progress animator
                const progressAnimator = progressCallback
                    ? new SmoothProgressAnimator(progressCallback)
                    : null;

                // Create translation tasks
                const tasks = keys.map(key => async () => {
                    const englishText = englishTranslations[key];

                    // Skip empty strings
                    if (!englishText || englishText.trim() === '') {
                        return { key, translatedText: englishText };
                    }

                    // Use hybrid translation function
                    try {
                        const translatedText = await translateTextSmart(englishText, langCode);
                        return { key, translatedText };
                    } catch (err) {
                        console.warn(`⚠️ Translation failed for key "${key}":`, err.message);
                        return { key, translatedText: englishText };
                    }
                });

                // Stream results as they complete
                let processedCount = 0;
                for await (const { success, result, completedCount } of streamingTranslationQueue(tasks, 5)) {
                    if (success && result) {
                        const { key, translatedText } = result;
                        translated[key] = translatedText;
                        processedCount++;

                        // Update smooth progress
                        const progress = (completedCount / totalKeys) * 100;
                        if (progressAnimator) {
                            progressAnimator.setTarget(progress);
                        }

                        // Log progress every 10%
                        if (completedCount % Math.ceil(totalKeys / 10) === 0) {
                            console.log(`⚡ Progress: ${completedCount}/${totalKeys} (${Math.round(progress)}%)`);
                        }
                    }
                }

                // Ensure progress reaches 100%
                if (progressAnimator) {
                    progressAnimator.complete();
                }

                const duration = ((Date.now() - startTime) / 1000).toFixed(1);
                console.log(`✅ STREAMING translation complete in ${duration}s for ${languageName}!`);
                console.log(`📊 Total: ${processedCount}/${totalKeys} strings translated`);
                console.log(`💾 All cached in localStorage for instant reuse`);

                // Store in TRANSLATIONS object
                if (typeof TRANSLATIONS !== 'undefined') {
                    TRANSLATIONS[langCode] = translated;
                    console.log(`✅ Stored ${langCode} translations in TRANSLATIONS object`);
                } else {
                    console.warn('⚠️ TRANSLATIONS object not available');
                }

                return translated;

            } catch (error) {
                console.error('❌ Translation generation failed:', error);
                return null;
            }
        }

        /**
         * Get human-readable language name from code
         */
        function getLanguageName(langCode) {
            const languageNames = {
                'en': 'English',
                'hi': 'Hindi',
                'ta': 'Tamil',
                'gu': 'Gujarati',
                'mr': 'Marathi',
                'es': 'Spanish',
                'fr': 'French',
                'de': 'German',
                'it': 'Italian',
                'pt': 'Portuguese',
                'ja': 'Japanese',
                'ko': 'Korean',
                'zh': 'Chinese',
                'ar': 'Arabic',
                'ru': 'Russian',
                'tr': 'Turkish',
                'pl': 'Polish',
                'nl': 'Dutch',
                'sv': 'Swedish',
                'da': 'Danish',
                'fi': 'Finnish',
                'no': 'Norwegian',
                'cs': 'Czech',
                'ro': 'Romanian',
                'bg': 'Bulgarian',
                'el': 'Greek',
                'he': 'Hebrew',
                'th': 'Thai',
                'vi': 'Vietnamese',
                'id': 'Indonesian',
                'ms': 'Malay',
                'uk': 'Ukrainian',
                'hu': 'Hungarian',
                'sk': 'Slovak'
            };
            return languageNames[langCode] || langCode.toUpperCase();
        }

        /**
         * SIMPLIFIED: Initialize language system
         * Two fixed languages: English, Hindi
         * Translations generated on-demand when user switches
         */
        async function initializeLanguageSystem() {
            console.log('🚀 Initializing simplified language system...');
            console.log('📊 Fixed languages: English (en), Hindi (hi)');

            // Set default language to English
            if (!assessmentData.currentLanguage) {
                assessmentData.currentLanguage = 'en';
            }

            // Check saved preference (only en or hi)
            const savedLang = localStorage.getItem('preferred_language');
            if (savedLang && ['en', 'hi'].includes(savedLang)) {
                assessmentData.currentLanguage = savedLang;
                console.log('✅ Loaded saved language preference:', savedLang);
            } else if (savedLang) {
                // Reset any other language to English
                console.log('⚠️ Saved language was:', savedLang, '- resetting to English');
                assessmentData.currentLanguage = 'en';
                localStorage.setItem('preferred_language', 'en');
            }

            // Setup language buttons (will show EN and HI only)
            setupLanguages();
            console.log('✅ Language system initialized successfully');
        }

        // CONTEXT MATRIX - Comprehensive body-part specific configuration
        const CONTEXT_MATRIX = {
            knee: {
                duration: {
                    options: ['1-2 weeks', '2-4 weeks', '1-3 months', '3-6 months', '6+ months'],
                    contextQuestions: [
                        { label: 'Does it hurt when climbing stairs?', type: 'radio', options: ['Yes', 'No', 'Sometimes'] },
                        { label: 'Do you hear any clicking or popping sounds?', type: 'radio', options: ['Yes', 'No', 'Occasionally'] },
                        { label: 'Is there swelling around the knee?', type: 'radio', options: ['Yes', 'No', 'Mild swelling'] }
                    ]
                },
                activities: ['Walking', 'Running', 'Climbing stairs', 'Squatting', 'Standing for long periods']
            },
            back: {
                duration: {
                    options: ['Less than 1 week', '1-4 weeks', '1-3 months', '3-6 months', 'Chronic (6+ months)'],
                    contextQuestions: [
                        { label: 'Does the pain radiate to your legs?', type: 'radio', options: ['Yes', 'No', 'Sometimes'] },
                        { label: 'Is it worse in the morning?', type: 'radio', options: ['Yes', 'No', 'About the same'] },
                        { label: 'Does coughing or sneezing increase the pain?', type: 'radio', options: ['Yes', 'No', 'Slightly'] }
                    ]
                },
                activities: ['Sitting', 'Standing', 'Bending', 'Lifting objects', 'Sleeping']
            },
            shoulder: {
                duration: {
                    options: ['1-2 weeks', '2-4 weeks', '1-3 months', '3-6 months', '6+ months'],
                    contextQuestions: [
                        { label: 'Can you raise your arm above your head?', type: 'radio', options: ['Yes', 'No', 'With difficulty'] },
                        { label: 'Do you feel weakness in the shoulder?', type: 'radio', options: ['Yes', 'No', 'Sometimes'] },
                        { label: 'Is there pain at night?', type: 'radio', options: ['Yes', 'No', 'Occasionally'] }
                    ]
                },
                activities: ['Reaching overhead', 'Lifting objects', 'Carrying bags', 'Sleeping on that side', 'Throwing motions']
            },
            neck: {
                duration: {
                    options: ['1-2 days', '3-7 days', '1-4 weeks', '1-3 months', '3+ months'],
                    contextQuestions: [
                        { label: 'Do you have headaches associated with neck pain?', type: 'radio', options: ['Yes', 'No', 'Sometimes'] },
                        { label: 'Does the pain radiate to your arms?', type: 'radio', options: ['Yes', 'No', 'Occasionally'] },
                        { label: 'Is it difficult to turn your head?', type: 'radio', options: ['Yes', 'No', 'Slightly'] }
                    ]
                },
                activities: ['Looking at phone/computer', 'Driving', 'Reading', 'Sleeping', 'Turning head']
            },
            wrist: {
                duration: {
                    options: ['1-3 days', '4-7 days', '1-2 weeks', '2-4 weeks', '1+ month'],
                    contextQuestions: [
                        { label: 'Do you have numbness or tingling in your fingers?', type: 'radio', options: ['Yes', 'No', 'Sometimes'] },
                        { label: 'Is grip strength affected?', type: 'radio', options: ['Yes', 'No', 'Slightly'] },
                        { label: 'Does typing or writing increase pain?', type: 'radio', options: ['Yes', 'No', 'Moderately'] }
                    ]
                },
                activities: ['Typing', 'Writing', 'Gripping objects', 'Using phone', 'Lifting items']
            },
            ankle: {
                duration: {
                    options: ['1-3 days', '4-7 days', '1-2 weeks', '2-4 weeks', '1+ month'],
                    contextQuestions: [
                        { label: 'Did you injure your ankle recently?', type: 'radio', options: ['Yes', 'No', 'Not sure'] },
                        { label: 'Is there visible swelling or bruising?', type: 'radio', options: ['Yes', 'No', 'Mild'] },
                        { label: 'Can you bear weight on it?', type: 'radio', options: ['Yes', 'No', 'With difficulty'] }
                    ]
                },
                activities: ['Walking', 'Running', 'Climbing stairs', 'Standing', 'Sports activities']
            },
            hip: {
                duration: {
                    options: ['1-2 weeks', '2-4 weeks', '1-3 months', '3-6 months', '6+ months'],
                    contextQuestions: [
                        { label: 'Does the pain radiate to the groin?', type: 'radio', options: ['Yes', 'No', 'Sometimes'] },
                        { label: 'Is it difficult to put on shoes/socks?', type: 'radio', options: ['Yes', 'No', 'Slightly'] },
                        { label: 'Do you hear clicking sounds from the hip?', type: 'radio', options: ['Yes', 'No', 'Occasionally'] }
                    ]
                },
                activities: ['Walking', 'Climbing stairs', 'Sitting for long periods', 'Getting up from sitting', 'Lying on that side']
            }
        };

        // IMPACT MATRIX - Body-part specific impact questions
        const IMPACT_MATRIX = {
            knee: {
                mild: { title: 'Mild Discomfort', description: 'Slight stiffness, manageable with rest', icon: 'check-circle' },
                moderate: { title: 'Moderate Pain', description: 'Difficulty with stairs and prolonged standing', icon: 'alert-triangle' },
                severe: { title: 'Severe Limitation', description: 'Walking is painful, daily activities affected', icon: 'alert-circle' },
                critical: { title: 'Critical', description: 'Unable to bear weight, needs immediate attention', icon: 'alert-octagon' }
            },
            back: {
                mild: { title: 'Mild Ache', description: 'Occasional discomfort when sitting/standing', icon: 'check-circle' },
                moderate: { title: 'Moderate Pain', description: 'Affects bending, lifting, and daily tasks', icon: 'alert-triangle' },
                severe: { title: 'Severe Pain', description: 'Radiating pain, difficulty with movement', icon: 'alert-circle' },
                critical: { title: 'Critical', description: 'Immobilizing pain, neurological symptoms', icon: 'alert-octagon' }
            },
            shoulder: {
                mild: { title: 'Mild Stiffness', description: 'Limited overhead reach, manageable', icon: 'check-circle' },
                moderate: { title: 'Moderate Pain', description: 'Difficulty with dressing and carrying', icon: 'alert-triangle' },
                severe: { title: 'Severe Restriction', description: 'Cannot lift arm, nighttime pain', icon: 'alert-circle' },
                critical: { title: 'Critical', description: 'Frozen shoulder, severe weakness', icon: 'alert-octagon' }
            },
            neck: {
                mild: { title: 'Mild Stiffness', description: 'Slight discomfort turning head', icon: 'check-circle' },
                moderate: { title: 'Moderate Pain', description: 'Headaches, difficulty driving', icon: 'alert-triangle' },
                severe: { title: 'Severe Pain', description: 'Radiating pain to arms, constant discomfort', icon: 'alert-circle' },
                critical: { title: 'Critical', description: 'Severe headaches, numbness, tingling', icon: 'alert-octagon' }
            },
            wrist: {
                mild: { title: 'Mild Ache', description: 'Slight discomfort with gripping', icon: 'check-circle' },
                moderate: { title: 'Moderate Pain', description: 'Difficulty typing, writing, gripping', icon: 'alert-triangle' },
                severe: { title: 'Severe Pain', description: 'Constant pain, weakness, numbness', icon: 'alert-circle' },
                critical: { title: 'Critical', description: 'Unable to use hand, severe weakness', icon: 'alert-octagon' }
            },
            ankle: {
                mild: { title: 'Mild Discomfort', description: 'Slight pain when walking', icon: 'check-circle' },
                moderate: { title: 'Moderate Pain', description: 'Swelling, difficulty with stairs', icon: 'alert-triangle' },
                severe: { title: 'Severe Pain', description: 'Significant swelling, limited mobility', icon: 'alert-circle' },
                critical: { title: 'Critical', description: 'Cannot bear weight, severe instability', icon: 'alert-octagon' }
            },
            hip: {
                mild: { title: 'Mild Ache', description: 'Occasional discomfort with movement', icon: 'check-circle' },
                moderate: { title: 'Moderate Pain', description: 'Difficulty with stairs, getting up', icon: 'alert-triangle' },
                severe: { title: 'Severe Pain', description: 'Constant pain, limping, limited range', icon: 'alert-circle' },
                critical: { title: 'Critical', description: 'Unable to walk, severe stiffness', icon: 'alert-octagon' }
            },
            head: {
                mild: { title: 'Mild Headache', description: 'Occasional discomfort, manageable', icon: 'check-circle' },
                moderate: { title: 'Moderate Headache', description: 'Frequent pain, affects concentration', icon: 'alert-triangle' },
                severe: { title: 'Severe Headache', description: 'Constant pain, light/sound sensitivity', icon: 'alert-circle' },
                critical: { title: 'Critical', description: 'Debilitating migraines, vision changes', icon: 'alert-octagon' }
            },
            arm: {
                mild: { title: 'Mild Discomfort', description: 'Slight ache during movement', icon: 'check-circle' },
                moderate: { title: 'Moderate Pain', description: 'Difficulty lifting objects, reaching', icon: 'alert-triangle' },
                severe: { title: 'Severe Pain', description: 'Constant pain, weakness, limited use', icon: 'alert-circle' },
                critical: { title: 'Critical', description: 'Cannot use arm, severe weakness', icon: 'alert-octagon' }
            },
            elbow: {
                mild: { title: 'Mild Stiffness', description: 'Slight discomfort bending arm', icon: 'check-circle' },
                moderate: { title: 'Moderate Pain', description: 'Tennis/golfer elbow symptoms', icon: 'alert-triangle' },
                severe: { title: 'Severe Pain', description: 'Constant pain, gripping difficulty', icon: 'alert-circle' },
                critical: { title: 'Critical', description: 'Unable to bend arm, severe inflammation', icon: 'alert-octagon' }
            },
            leg: {
                mild: { title: 'Mild Ache', description: 'Slight discomfort when walking', icon: 'check-circle' },
                moderate: { title: 'Moderate Pain', description: 'Difficulty with stairs, running', icon: 'alert-triangle' },
                severe: { title: 'Severe Pain', description: 'Walking is painful, frequent resting', icon: 'alert-circle' },
                critical: { title: 'Critical', description: 'Cannot walk properly, severe weakness', icon: 'alert-octagon' }
            },
            hand: {
                mild: { title: 'Mild Discomfort', description: 'Slight pain with fine movements', icon: 'check-circle' },
                moderate: { title: 'Moderate Pain', description: 'Difficulty gripping, writing, typing', icon: 'alert-triangle' },
                severe: { title: 'Severe Pain', description: 'Constant pain, swelling, numbness', icon: 'alert-circle' },
                critical: { title: 'Critical', description: 'Cannot use hand, severe dysfunction', icon: 'alert-octagon' }
            },
            foot: {
                mild: { title: 'Mild Discomfort', description: 'Slight pain when walking', icon: 'check-circle' },
                moderate: { title: 'Moderate Pain', description: 'Difficulty standing, heel pain', icon: 'alert-triangle' },
                severe: { title: 'Severe Pain', description: 'Walking is painful, swelling present', icon: 'alert-circle' },
                critical: { title: 'Critical', description: 'Cannot bear weight, severe dysfunction', icon: 'alert-octagon' }
            },
            // Default for other body parts
            default: {
                mild: { title: 'Mild', description: 'Slightly annoying', icon: 'check-circle' },
                moderate: { title: 'Moderate', description: 'Affects some activities', icon: 'alert-triangle' },
                severe: { title: 'Severe', description: 'Significantly limits daily life', icon: 'alert-circle' },
                critical: { title: 'Critical', description: 'Unable to perform basic tasks', icon: 'alert-octagon' }
            }
        };

        // API Configuration for OpenAI and TTS
        let API_CONFIG = {
            openai: {
                key: localStorage.getItem('openai_api_key') || '',
                model: 'gpt-4o-mini',
                endpoint: 'https://api.openai.com/v1/chat/completions'
            },
            whisper: {
                endpoint: 'https://api.openai.com/v1/audio/transcriptions',
                model: 'whisper-1'
            },
            tts: {
                provider: localStorage.getItem('tts_provider') || 'browser',
                key: localStorage.getItem('tts_api_key') || '',
                openai: {
                    endpoint: 'https://api.openai.com/v1/audio/speech',
                    voice: localStorage.getItem('openai_tts_voice') || 'alloy',
                    model: 'tts-1'
                },
                elevenlabs: {
                    endpoint: 'https://api.elevenlabs.io/v1/text-to-speech',
                    voiceId: '21m00Tcm4TlvDq8ikWAM'
                },
                google: {
                    endpoint: 'https://texttospeech.googleapis.com/v1/text:synthesize'
                }
            }
        };

        // Additional state variables
        let currentAudio = null;
        let forecastChart = null;
        let confidenceChart = null;
        let tooltipTimeout = null;

        function generateSessionId() {
            return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }

        // ==================== AI-POWERED IMPACT GENERATION ====================
        /**
         * Generate smart, context-aware impact questions and activity triggers
         * using OpenAI GPT based on selected body parts
         */
        async function generateAIImpactContext(selectedParts) {
            console.log('🧠 generateAIImpactContext() called with:', selectedParts);

            if (!selectedParts || selectedParts.length === 0) {
                console.log('ℹ️ No body parts selected, skipping AI generation');
                return null;
            }

            // Check if API key is configured
            if (!API_CONFIG.openai.key) {
                console.warn('⚠️ OpenAI API key not configured, using fallback impact data');
                return getFallbackImpactContext(selectedParts);
            }

            try {
                const prompt = `
You are a physiotherapy assistant. The user has reported pain in the following body parts: ${selectedParts.join(', ')}.

Generate personalized assessment data in JSON format:
1. 3-5 "contextQuestions" (yes/no/sometimes format) - specific to the affected body parts
2. 4-6 "activityTriggers" - daily activities likely to be affected

Use simple, patient-friendly language. Be specific to the body parts mentioned.

Example format:
{
    "contextQuestions": [
        "Does your pain increase while walking?",
        "Do you feel stiffness in the morning?",
        "Is there swelling in the affected area?"
    ],
    "activityTriggers": [
        "Walking",
        "Standing",
        "Climbing stairs",
        "Sitting for long periods"
    ]
}

Respond ONLY with valid JSON, no additional text.
                `.trim();

                console.log('🤖 Sending request to OpenAI API...');
                console.log('📝 Prompt:', prompt.substring(0, 150) + '...');

                const response = await fetch(API_CONFIG.openai.endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${API_CONFIG.openai.key}`
                    },
                    body: JSON.stringify({
                        model: API_CONFIG.openai.model,
                        messages: [{ role: "user", content: prompt }],
                        temperature: 0.7,
                        max_tokens: 500
                    })
                });

                if (!response.ok) {
                    console.error('❌ OpenAI API error:', response.status, response.statusText);
                    return getFallbackImpactContext(selectedParts);
                }

                const data = await response.json();
                console.log('✅ OpenAI API response received');

                const content = data.choices?.[0]?.message?.content;
                if (!content) {
                    console.error('❌ No content in OpenAI response');
                    return getFallbackImpactContext(selectedParts);
                }

                console.log('📊 Raw AI response:', content);

                // Parse JSON response
                const impactData = JSON.parse(content);
                console.log('✅ Parsed AI impact data:', impactData);

                // Validate structure
                if (!impactData.contextQuestions || !impactData.activityTriggers) {
                    console.error('❌ Invalid impact data structure');
                    return getFallbackImpactContext(selectedParts);
                }

                console.log(`✅ AI generated ${impactData.contextQuestions.length} questions and ${impactData.activityTriggers.length} triggers`);
                return impactData;

            } catch (error) {
                console.error('❌ AI Impact generation failed:', error);
                return getFallbackImpactContext(selectedParts);
            }
        }

        /**
         * Fallback impact context when AI is unavailable
         */
        function getFallbackImpactContext(selectedParts) {
            console.log('📦 Using fallback impact context');

            const genericQuestions = [
                "Does your pain increase with movement?",
                "Do you experience stiffness in the morning?",
                "Is there visible swelling or redness?",
                "Does rest help reduce the pain?"
            ];

            const genericTriggers = [
                "Walking",
                "Standing",
                "Sitting",
                "Bending",
                "Lifting objects",
                "Sleeping"
            ];

            return {
                contextQuestions: genericQuestions,
                activityTriggers: genericTriggers
            };
        }

        /**
         * Render AI-generated impact section with animations
         */
        async function renderAIImpactSection() {
            console.log('🎨 renderAIImpactSection() called');

            const selected = assessmentData.selectedParts || [];
            if (!selected.length) {
                console.log('ℹ️ No body parts selected');
                return;
            }

            // Show loading state
            const impactContainer = document.getElementById('aiImpactContainer');
            if (!impactContainer) {
                console.error('❌ aiImpactContainer element not found');
                return;
            }

            impactContainer.innerHTML = `
                <div class="ai-loading">
                    <div class="loading-spinner"></div>
                    <p>🧠 Generating personalized questions...</p>
                </div>
            `;

            // Generate AI context
            const aiData = await generateAIImpactContext(selected);

            if (!aiData) {
                console.log('⚠️ No AI data generated');
                impactContainer.innerHTML = '';
                return;
            }

            const { contextQuestions, activityTriggers } = aiData;

            // Build questions HTML
            const questionsHTML = contextQuestions.map((q, idx) => `
                <div class="context-question fade-in" style="animation-delay: ${idx * 0.1}s">
                    <label class="question-label">${q}</label>
                    <div class="question-options">
                        <button class="option-btn" onclick="selectContextOption('${q}', 'Yes')">Yes</button>
                        <button class="option-btn" onclick="selectContextOption('${q}', 'No')">No</button>
                        <button class="option-btn" onclick="selectContextOption('${q}', 'Sometimes')">Sometimes</button>
                    </div>
                </div>
            `).join('');

            // Build triggers HTML
            const triggersHTML = activityTriggers.map((t, idx) => `
                <button class="trigger-btn pulse-btn" style="animation-delay: ${idx * 0.05}s" onclick="toggleActivityTrigger('${t}')">${t}</button>
            `).join('');

            // Render with animations
            impactContainer.innerHTML = `
                <div class="dynamic-impact ai-generated">
                    <div class="ai-badge">🧠 AI-Generated</div>
                    <h4 class="impact-section-title">📋 Additional Context Questions</h4>
                    <div class="context-questions-container">
                        ${questionsHTML}
                    </div>
                    <h4 class="impact-section-title">⚡ Activity Triggers</h4>
                    <p class="impact-subtitle">Select activities that worsen your pain:</p>
                    <div class="trigger-list">
                        ${triggersHTML}
                    </div>
                </div>
            `;

            console.log('✅ AI impact section rendered');
        }

        /**
         * Handle context option selection
         */
        function selectContextOption(question, answer) {
            console.log(`📝 Context answer: "${question}" → ${answer}`);

            if (!assessmentData.contextAnswers) {
                assessmentData.contextAnswers = {};
            }

            assessmentData.contextAnswers[question] = answer;

            // Visual feedback
            const questionDiv = event.target.closest('.context-question');
            if (questionDiv) {
                questionDiv.classList.add('answered');
                // Update button states
                questionDiv.querySelectorAll('.option-btn').forEach(btn => {
                    btn.classList.remove('selected');
                });
                event.target.classList.add('selected');
            }

            saveSession();
        }

        /**
         * Toggle activity trigger selection
         */
        function toggleActivityTrigger(trigger) {
            console.log(`⚡ Toggle activity trigger: ${trigger}`);

            if (!assessmentData.activityTriggers) {
                assessmentData.activityTriggers = [];
            }

            const index = assessmentData.activityTriggers.indexOf(trigger);
            if (index > -1) {
                assessmentData.activityTriggers.splice(index, 1);
                event.target.classList.remove('selected');
                console.log('➖ Removed trigger');
            } else {
                assessmentData.activityTriggers.push(trigger);
                event.target.classList.add('selected');
                console.log('➕ Added trigger');
            }

            console.log('📊 Current triggers:', assessmentData.activityTriggers);
            saveSession();
        }

        // LOCALSTORAGE MANAGEMENT
        function saveSession() {
            try {
                localStorage.setItem('painAssessmentSession', JSON.stringify(assessmentData));
                localStorage.setItem('painAssessmentTimestamp', Date.now().toString());
                console.log('Session saved successfully');
            } catch (e) {
                console.error('Error saving session:', e);
            }
        }

        function loadSession() {
            try {
                const saved = localStorage.getItem('painAssessmentSession');
                const timestamp = localStorage.getItem('painAssessmentTimestamp');

                if (saved && timestamp) {
                    const age = Date.now() - parseInt(timestamp);
                    // Session expires after 24 hours
                    if (age < 24 * 60 * 60 * 1000) {
                        const data = JSON.parse(saved);
                        // Restore only if on first step
                        if (data.currentStep === 1 && confirm('Continue previous assessment?')) {
                            assessmentData = data;
                            restoreUI();
                        }
                    }
                }
            } catch (e) {
                console.error('Error loading session:', e);
            }
        }

        function restoreUI() {
            if (assessmentData.bodyPart) {
                selectBodyPart(assessmentData.bodyPart, false);
            }
            if (assessmentData.intensity) {
                selectIntensity(assessmentData.intensity, false);
            }
            if (assessmentData.gender) {
                toggleGender(assessmentData.gender, false);
            }
        }

        // ====================  API CONFIGURATION ====================
        function openConfig() {
            document.getElementById('configModal').classList.add('active');
            document.getElementById('openaiKey').value = API_CONFIG.openai.key;
            document.getElementById('googleTranslateKey').value = localStorage.getItem('google_translate_api_key') || '';
            document.getElementById('deeplKey').value = localStorage.getItem('deepl_api_key') || '';
            document.getElementById('ttsProvider').value = API_CONFIG.tts.provider;
            document.getElementById('openaiVoice').value = API_CONFIG.tts.openai.voice;

            // Show/hide OpenAI voice selector
            const openaiVoiceGroup = document.getElementById('openaiVoiceGroup');
            if (API_CONFIG.tts.provider === 'openai') {
                openaiVoiceGroup.style.display = 'block';
            } else {
                openaiVoiceGroup.style.display = 'none';
            }

            // Show/hide TTS key field
            if (API_CONFIG.tts.provider !== 'browser' && API_CONFIG.tts.provider !== 'openai') {
                document.getElementById('ttsKeyGroup').style.display = 'block';
                document.getElementById('ttsKey').value = API_CONFIG.tts.key;
            } else {
                document.getElementById('ttsKeyGroup').style.display = 'none';
            }
        }

        document.getElementById('ttsProvider')?.addEventListener('change', function(e) {
            const ttsKeyGroup = document.getElementById('ttsKeyGroup');
            const openaiVoiceGroup = document.getElementById('openaiVoiceGroup');

            // Show OpenAI voice selector only when OpenAI TTS is selected
            if (e.target.value === 'openai') {
                openaiVoiceGroup.style.display = 'block';
                ttsKeyGroup.style.display = 'none';
            } else {
                openaiVoiceGroup.style.display = 'none';
            }

            // Show TTS key field for ElevenLabs and Google Cloud
            if (e.target.value === 'browser' || e.target.value === 'openai') {
                ttsKeyGroup.style.display = 'none';
            } else {
                ttsKeyGroup.style.display = 'block';
            }
        });

        // Duration slider is now initialized inside DOMContentLoaded event

        function saveConfig() {
            const openaiKey = document.getElementById('openaiKey').value.trim();
            const googleTranslateKey = document.getElementById('googleTranslateKey').value.trim();
            const deeplKey = document.getElementById('deeplKey').value.trim();
            const ttsProvider = document.getElementById('ttsProvider').value;
            const ttsKey = document.getElementById('ttsKey').value.trim();
            const openaiVoice = document.getElementById('openaiVoice').value;

            if (!openaiKey) {
                alert('Please enter your OpenAI API key');
                return;
            }

            localStorage.setItem('openai_api_key', openaiKey);
            localStorage.setItem('tts_provider', ttsProvider);
            localStorage.setItem('openai_tts_voice', openaiVoice);

            // Save Google Translate key if provided (optional)
            if (googleTranslateKey) {
                localStorage.setItem('google_translate_api_key', googleTranslateKey);
            } else {
                localStorage.removeItem('google_translate_api_key');
            }

            // Save DeepL key if provided (optional)
            if (deeplKey) {
                localStorage.setItem('deepl_api_key', deeplKey);
            } else {
                localStorage.removeItem('deepl_api_key');
            }

            if (ttsProvider !== 'browser' && ttsProvider !== 'openai') {
                localStorage.setItem('tts_api_key', ttsKey);
            }

            API_CONFIG.openai.key = openaiKey;
            API_CONFIG.tts.provider = ttsProvider;
            API_CONFIG.tts.key = ttsKey;
            API_CONFIG.tts.openai.voice = openaiVoice;

            document.getElementById('configModal').classList.remove('active');
            speak('Configuration saved successfully');
        }

        // ==================== OPENAI INTEGRATION ====================
        async function callOpenAI(prompt) {
            if (!API_CONFIG.openai.key) {
                console.log('OpenAI API key not configured');
                return null;
            }

            try {
                const response = await fetch(API_CONFIG.openai.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${API_CONFIG.openai.key}`
                    },
                    body: JSON.stringify({
                        model: API_CONFIG.openai.model,
                        messages: [
                            {
                                role: 'system',
                                content: 'You are an expert physiotherapist providing professional medical assessment. Be thorough, accurate, and empathetic.'
                            },
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        temperature: 0.7,
                        max_tokens: 1000
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    console.error('OpenAI API Error:', error);

                    if (response.status === 401) {
                        alert('Invalid OpenAI API key. Please check your configuration.');
                    } else if (response.status === 429) {
                        alert('Rate limit exceeded. Please try again later.');
                    }
                    return null;
                }

                const data = await response.json();
                return data.choices[0].message.content;

            } catch (error) {
                console.error('Error calling OpenAI:', error);
                return null;
            }
        }

        function buildPhysiotherapyPrompt() {
            const frequencyText = assessmentData.painFrequency ? `\n- Pain Frequency: ${assessmentData.painFrequency}` : '';
            const painTypeText = assessmentData.painType ? `\n- Pain Type: ${assessmentData.painType}` : '';
            const durationMonthsText = assessmentData.durationMonths ? `\n- Duration in Months: ${assessmentData.durationMonths} month(s)` : '';
            const triggersText = assessmentData.activityTriggers.length > 0 ? `\n- Activity Triggers: ${assessmentData.activityTriggers.join(', ')}` : '';
            const notesText = assessmentData.additionalNotes ? `\n- Additional Notes: ${assessmentData.additionalNotes}` : '';

            return `You are an expert physiotherapist AI assistant with years of clinical experience. Analyze the following comprehensive patient pain assessment and provide professional, evidence-based insights.

PATIENT DETAILS:
- Gender: ${assessmentData.gender}
- Affected Body Part: ${assessmentData.bodyPart}
- Pain Intensity: ${assessmentData.intensity}/10 (${assessmentData.intensityLabel})
- Duration: ${assessmentData.duration}${durationMonthsText}${frequencyText}${painTypeText}${triggersText}
- Affected Activities: ${assessmentData.activities.join(', ')}${notesText}

INSTRUCTIONS:
Based on this detailed information, provide a comprehensive analysis:

1. **Initial Assessment**: Give a brief clinical impression (2-3 sentences) considering pain type, frequency, and triggers.

2. **Likely Diagnosis**: Provide 1-2 possible diagnoses based on:
   - Pain location and type (${assessmentData.painType || 'not specified'})
   - Frequency pattern (${assessmentData.painFrequency || 'not specified'})
   - Activity triggers and aggravating factors
   - Duration and progression
   Be specific but include appropriate medical disclaimers.

3. **Recovery Timeline**: Provide a realistic timeline with:
   - Expected recovery duration
   - Key milestones (week 2, week 4, week 8, etc.)
   - Factors that may speed up or slow recovery
   - Confidence level in the timeline

4. **Treatment Plan**: Recommend:
   - Specific exercises (with frequency/duration)
   - Physical therapy modalities
   - Lifestyle modifications
   - When to seek immediate medical attention
   - Self-care strategies

Format your response in 4 clear sections with headers:
- Initial Assessment
- Diagnosis & Analysis
- Recovery Timeline
- Treatment Plan

Keep each section concise, evidence-based, and patient-friendly. Use professional but accessible language.`;
        }

        // ==================== TEXT-TO-SPEECH ====================
        async function speak(text) {
            if (!assessmentData.voiceEnabled) return;

            const provider = API_CONFIG.tts.provider;

            if (provider === 'browser') {
                speakBrowser(text);
            } else if (provider === 'openai' && API_CONFIG.openai.key) {
                await speakOpenAI(text);
            } else if (provider === 'elevenlabs' && API_CONFIG.tts.key) {
                await speakElevenLabs(text);
            } else if (provider === 'google' && API_CONFIG.tts.key) {
                await speakGoogle(text);
            } else {
                speakBrowser(text);
            }
        }

        function speakBrowser(text) {
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 0.9;
                utterance.pitch = 1;

                if (assessmentData.currentLanguage === 'hi') {
                    utterance.lang = 'hi-IN';
                } else {
                    utterance.lang = 'en-US';
                }

                speechSynthesis.speak(utterance);
            }
        }

        async function speakOpenAI(text) {
            try {
                const response = await fetch(API_CONFIG.tts.openai.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${API_CONFIG.openai.key}`
                    },
                    body: JSON.stringify({
                        model: API_CONFIG.tts.openai.model,
                        voice: API_CONFIG.tts.openai.voice,
                        input: text,
                        speed: 1.0
                    })
                });

                if (response.ok) {
                    const audioBlob = await response.blob();
                    const audioUrl = URL.createObjectURL(audioBlob);
                    playAudioUrl(audioUrl);
                } else {
                    const errorText = await response.text();
                    console.error('OpenAI TTS error:', errorText);
                    speakBrowser(text);
                }
            } catch (error) {
                console.error('Error with OpenAI TTS:', error);
                speakBrowser(text);
            }
        }

        async function speakElevenLabs(text) {
            try {
                const response = await fetch(`${API_CONFIG.tts.elevenlabs.endpoint}/${API_CONFIG.tts.elevenlabs.voiceId}`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'application/json',
                        'xi-api-key': API_CONFIG.tts.key
                    },
                    body: JSON.stringify({
                        text: text,
                        model_id: 'eleven_monolingual_v1',
                        voice_settings: {
                            stability: 0.5,
                            similarity_boost: 0.5
                        }
                    })
                });

                if (response.ok) {
                    const audioBlob = await response.blob();
                    const audioUrl = URL.createObjectURL(audioBlob);
                    playAudioUrl(audioUrl);
                } else {
                    console.error('ElevenLabs TTS error:', await response.text());
                    speakBrowser(text);
                }
            } catch (error) {
                console.error('Error with ElevenLabs TTS:', error);
                speakBrowser(text);
            }
        }

        async function speakGoogle(text) {
            try {
                const response = await fetch(`${API_CONFIG.tts.google.endpoint}?key=${API_CONFIG.tts.key}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        input: { text: text },
                        voice: {
                            languageCode: assessmentData.currentLanguage === 'hi' ? 'hi-IN' : 'en-US',
                            name: assessmentData.currentLanguage === 'hi' ? 'hi-IN-Wavenet-A' : 'en-US-Wavenet-D'
                        },
                        audioConfig: {
                            audioEncoding: 'MP3'
                        }
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const audioContent = data.audioContent;
                    const audioBlob = base64ToBlob(audioContent, 'audio/mp3');
                    const audioUrl = URL.createObjectURL(audioBlob);
                    playAudioUrl(audioUrl);
                } else {
                    console.error('Google TTS error:', await response.text());
                    speakBrowser(text);
                }
            } catch (error) {
                console.error('Error with Google TTS:', error);
                speakBrowser(text);
            }
        }

        function base64ToBlob(base64, mimeType) {
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            return new Blob([byteArray], { type: mimeType });
        }

        function playAudioUrl(url) {
            if (currentAudio) {
                currentAudio.pause();
            }

            currentAudio = new Audio(url);
            currentAudio.play();

            const voiceWave = document.getElementById('voiceWave');
            if (voiceWave) voiceWave.style.display = 'inline-flex';

            currentAudio.addEventListener('ended', () => {
                currentAudio = null;
                if (voiceWave) voiceWave.style.display = 'none';
            });
        }

        function stopAudio() {
            if (currentAudio) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
                currentAudio = null;
            }

            if ('speechSynthesis' in window) {
                speechSynthesis.cancel();
            }

            const voiceWave = document.getElementById('voiceWave');
            if (voiceWave) voiceWave.style.display = 'none';
        }

        // ==================== VOICE HELPERS FOR DYNAMIC QUESTIONS ====================
        function speakQuestion(text, event) {
            if (event) event.preventDefault();
            const btn = event?.target?.closest('.voice-btn');

            // Toggle speaking class
            if (btn) {
                btn.classList.add('speaking');
                setTimeout(() => btn.classList.remove('speaking'), 3000);
            }

            // Use browser TTS for questions (always available)
            speakBrowser(text);
        }

        async function startVoiceAnswerInput(questionIndex, event) {
            if (event) event.preventDefault();

            const btn = event?.target?.closest('.voice-btn');
            if (!API_CONFIG.openai.key) {
                alert('OpenAI API key required for voice input. Please configure in settings.');
                return;
            }

            try {
                // Request microphone access
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream);
                const audioChunks = [];

                if (btn) {
                    btn.classList.add('listening');
                }

                mediaRecorder.addEventListener('dataavailable', event => {
                    audioChunks.push(event.data);
                });

                mediaRecorder.addEventListener('stop', async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

                    // Stop all tracks
                    stream.getTracks().forEach(track => track.stop());

                    if (btn) {
                        btn.classList.remove('listening');
                    }

                    // Transcribe with Whisper
                    const transcription = await transcribeAudio(audioBlob);
                    if (transcription) {
                        // Find closest match from options
                        const question = document.querySelectorAll('.context-question')[questionIndex];
                        const radios = question.querySelectorAll('input[type="radio"]');
                        const transcriptLower = transcription.toLowerCase();

                        // Simple matching logic
                        let bestMatch = null;
                        radios.forEach(radio => {
                            const value = radio.value.toLowerCase();
                            if (transcriptLower.includes(value) || value.includes(transcriptLower)) {
                                bestMatch = radio;
                            }
                        });

                        if (bestMatch) {
                            bestMatch.checked = true;
                            saveContextAnswer(questionIndex, bestMatch.value);
                            speakBrowser(`Answered: ${bestMatch.value}`);
                        } else {
                            speakBrowser('Could not understand. Please try again or select manually.');
                        }
                    }
                });

                // Record for 3 seconds
                mediaRecorder.start();
                setTimeout(() => {
                    if (mediaRecorder.state === 'recording') {
                        mediaRecorder.stop();
                    }
                }, 3000);

            } catch (error) {
                console.error('Voice input error:', error);
                if (btn) btn.classList.remove('listening');
                alert('Microphone access denied or not available');
            }
        }

        function saveContextAnswer(questionIndex, answer) {
            // Save to assessmentData
            if (!assessmentData.contextAnswers) {
                assessmentData.contextAnswers = {};
            }
            assessmentData.contextAnswers[`q${questionIndex}`] = answer;
            saveSession();
        }

        async function transcribeAudio(audioBlob) {
            if (!API_CONFIG.openai.key) return null;

            try {
                const formData = new FormData();
                formData.append('file', audioBlob, 'audio.webm');
                formData.append('model', API_CONFIG.whisper.model);

                const response = await fetch(API_CONFIG.whisper.endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${API_CONFIG.openai.key}`
                    },
                    body: formData
                });

                if (response.ok) {
                    const data = await response.json();
                    return data.text;
                } else {
                    console.error('Whisper error:', await response.text());
                    return null;
                }
            } catch (error) {
                console.error('Transcription error:', error);
                return null;
            }
        }

        function toggleVoice() {
            assessmentData.voiceEnabled = !assessmentData.voiceEnabled;

            const voiceToggle = document.getElementById('voiceToggle');
            const voiceWave = document.getElementById('voiceWave');

            if (assessmentData.voiceEnabled) {
                voiceToggle.style.background = 'linear-gradient(135deg, var(--success) 0%, #059669 100%)';
                speak('Voice enabled');
            } else {
                voiceToggle.style.background = '';
                stopAudio();
                if (voiceWave) voiceWave.style.display = 'none';
            }

            saveSession();
        }

        // GENDER TOGGLE
        function toggleGender(gender, save = true) {
            assessmentData.gender = gender;

            document.querySelectorAll('.gender-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector(`[data-gender="${gender}"]`).classList.add('active');

            // Toggle SVG visibility
            document.getElementById('maleSvg').style.display = gender === 'male' ? 'block' : 'none';
            document.getElementById('femaleSvg').style.display = gender === 'female' ? 'block' : 'none';

            if (save) saveSession();
        }

        // TOOLTIP FUNCTIONALITY
        function showTooltip(event, part) {
            clearTimeout(tooltipTimeout);

            const tooltip = document.getElementById('painTooltip');
            const element = event.currentTarget;
            const painTypes = element.getAttribute('data-pain-types').split(',');

            document.getElementById('tooltipTitle').textContent = part.charAt(0).toUpperCase() + part.slice(1) + ' Pain';

            const typesHtml = painTypes.map(type =>
                `<span class="pain-type-badge">${type}</span>`
            ).join('');
            document.querySelector('.tooltip-types').innerHTML = typesHtml;

            const rect = element.getBoundingClientRect();
            const container = document.querySelector('.body-svg-wrapper').getBoundingClientRect();

            tooltip.style.left = (rect.left - container.left + rect.width / 2) + 'px';
            tooltip.style.top = (rect.top - container.top - 10) + 'px';
            tooltip.style.transform = 'translate(-50%, -100%)';

            tooltipTimeout = setTimeout(() => {
                tooltip.classList.add('show');
            }, 200);
        }

        function hideTooltip() {
            clearTimeout(tooltipTimeout);
            document.getElementById('painTooltip').classList.remove('show');
        }

        // BODY PART SELECTION - Multi-selection with toggle support
        function selectBodyPart(part, save = true, clickEvent = null) {
            console.log('🔍 selectBodyPart called:', { part, hasClickEvent: !!clickEvent, hasWindowEvent: !!window.event });

            const currentSvg = assessmentData.gender === 'male' ? 'maleSvg' : 'femaleSvg';
            let clickedElement = null;

            // Determine which element was clicked - IMPROVED EVENT DETECTION
            if (clickEvent && clickEvent.target) {
                clickedElement = clickEvent.target;
                console.log('✅ Got element from clickEvent.target');
            } else if (clickEvent && clickEvent.currentTarget) {
                clickedElement = clickEvent.currentTarget;
                console.log('✅ Got element from clickEvent.currentTarget');
            } else if (typeof window !== 'undefined' && window.event && window.event.target) {
                // Fallback for inline onclick handlers
                clickedElement = window.event.target;
                console.log('✅ Got element from window.event.target');
            } else if (typeof window !== 'undefined' && window.event && window.event.srcElement) {
                // IE fallback
                clickedElement = window.event.srcElement;
                console.log('✅ Got element from window.event.srcElement (IE fallback)');
            } else {
                // Last resort: find first matching part for programmatic selection
                console.log('⚠️ Using fallback: querying DOM for first matching part');
                const matchingParts = document.querySelectorAll(`#${currentSvg} [data-part="${part}"]`);
                if (matchingParts.length > 0) {
                    clickedElement = matchingParts[0];
                }
            }

            if (!clickedElement) {
                console.error('❌ No clicked element found!');
                return;
            }

            // Ensure we're working with the body-part element
            if (!clickedElement.classList.contains('body-part')) {
                clickedElement = clickedElement.closest('.body-part');
            }
            if (!clickedElement) {
                console.error('❌ Could not find .body-part element');
                return;
            }

            console.log('✅ Found body-part element:', clickedElement.getAttribute('data-part'), 'at position:', {
                cx: clickedElement.getAttribute('cx'),
                x: clickedElement.getAttribute('x')
            });

            // Toggle selection
            const isCurrentlySelected = clickedElement.classList.contains('selected');

            if (isCurrentlySelected) {
                // Deselect this part
                clickedElement.classList.remove('selected');
                console.log('➖ Deselected:', clickedElement.getAttribute('data-part'));
            } else {
                // Select this part
                clickedElement.classList.add('selected');
                console.log('➕ Selected:', clickedElement.getAttribute('data-part'));
            }

            // Rebuild selectedParts from all selected elements
            const allSelected = document.querySelectorAll(`#${currentSvg} .body-part.selected`);
            assessmentData.selectedParts = Array.from(allSelected).map(el => el.getAttribute('data-part'));

            // Remove duplicates from selectedParts
            assessmentData.selectedParts = [...new Set(assessmentData.selectedParts)];

            console.log('📋 Selected parts:', assessmentData.selectedParts);

            // Update the main bodyPart to the first selected (for backward compatibility)
            assessmentData.bodyPart = assessmentData.selectedParts.length > 0 ? assessmentData.selectedParts[0] : null;

            // Update all dependent UI elements
            updateSelectedParts();
            updateSelectedPartsFeedback();

            checkStep1Complete();
            if (save) saveSession();

            // Voice feedback
            const action = isCurrentlySelected ? 'deselected' : 'selected';
            speak(`${part} ${action}`);
        }

        // Update the selected parts feedback bar in Step 1
        function updateSelectedPartsFeedback() {
            console.log('🎨 updateSelectedPartsFeedback() called');

            const feedbackBar = document.getElementById('selectedPartsDisplay');
            if (!feedbackBar) {
                console.error('❌ selectedPartsDisplay element not found');
                return;
            }

            const selectedParts = assessmentData.selectedParts || [];
            console.log('📍 Updating feedback bar with parts:', selectedParts);

            // Emoji mapping for body parts
            const emojiMap = {
                'head': '🧠',
                'neck': '🦴',
                'shoulder': '💪',
                'back': '🔙',
                'arm': '💪',
                'elbow': '🦾',
                'wrist': '🤲',
                'hand': '✋',
                'hip': '🦵',
                'leg': '🦵',
                'knee': '🦵',
                'ankle': '🦶',
                'foot': '🦶'
            };

            if (selectedParts.length === 0) {
                feedbackBar.innerHTML = '';
                console.log('✅ Cleared feedback bar (no parts selected)');
                return;
            }

            // Build feedback HTML
            const partBadges = selectedParts.map(part => {
                const emoji = emojiMap[part] || '📍';
                const formattedName = part.split('-').map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ');
                return `<span class="part-name">${emoji} ${formattedName}</span>`;
            }).join('');

            feedbackBar.innerHTML = `
                <span class="feedback-label">Selected:</span>
                ${partBadges}
            `;

            console.log(`✅ Updated feedback bar with ${selectedParts.length} part(s)`);
        }

        // Update UI based on all selected parts
        function updateSelectedParts() {
            const selectedParts = assessmentData.selectedParts;

            // Update selected parts display
            showSelectedPartsDisplay();

            if (selectedParts.length === 0) {
                // No parts selected - clear dynamic content
                return;
            }

            if (selectedParts.length === 1) {
                // Single part selected - use existing logic
                renderDynamicSections(selectedParts[0]);
                renderImpactOptions();
            } else {
                // Multiple parts selected - merge context
                renderDynamicSections(selectedParts[0]); // Use first part's context for now
                renderImpactForMultipleParts(selectedParts);
            }
        }

        // Display selected parts names above impact section WITH EMOJI BADGES
        function showSelectedPartsDisplay() {
            console.log('🎨 showSelectedPartsDisplay called');

            const step3 = document.getElementById('step3');
            if (!step3) {
                console.error('❌ Step3 element not found!');
                return;
            }

            const selectedParts = assessmentData.selectedParts;
            console.log('📋 Displaying parts:', selectedParts);

            // Find or create selected parts display
            let selectedDisplay = step3.querySelector('.selected-parts-display');
            if (!selectedDisplay) {
                selectedDisplay = document.createElement('div');
                selectedDisplay.className = 'selected-parts-display';
                // step3 IS the .step-content div, use it directly
                step3.insertBefore(selectedDisplay, step3.firstChild);
                console.log('✅ Created selected-parts-display element');
            }

            if (selectedParts.length === 0) {
                selectedDisplay.style.display = 'none';
                selectedDisplay.innerHTML = '<div class="selected-parts-empty">👆 Click on body parts above to select them</div>';
                console.log('ℹ️ No parts selected, hiding display');
                return;
            }

            // Emoji mapping for body parts
            const emojiMap = {
                'head': '🧠',
                'neck': '🦴',
                'shoulder': '💪',
                'back': '🔙',
                'arm': '💪',
                'elbow': '🦾',
                'wrist': '🤲',
                'hand': '✋',
                'hip': '🦵',
                'leg': '🦵',
                'knee': '🦵',
                'ankle': '🦶',
                'foot': '🦶'
            };

            // Format part names with emojis as badges
            const formatPartName = (part) => {
                const emoji = emojiMap[part] || '📍';
                const name = part.split('-').map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ');
                return `<span class="part-badge">${emoji} ${name}</span>`;
            };

            const partBadges = selectedParts.map(formatPartName).join(' ');

            selectedDisplay.style.display = 'block';
            selectedDisplay.innerHTML = `
                <div class="selected-parts-label">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                    <span>Selected Areas (${selectedParts.length}):</span>
                </div>
                <div class="selected-parts-badges">${partBadges}</div>
            `;

            console.log('✅ Display updated with', selectedParts.length, 'badges');
        }

        // Render combined impact options for multiple body parts WITH EMOJIS
        function renderImpactForMultipleParts(selectedParts) {
            console.log('💥 renderImpactForMultipleParts called with:', selectedParts);

            const step3 = document.getElementById('step3');
            if (!step3) {
                console.error('❌ Step3 not found!');
                return;
            }
            if (!selectedParts || selectedParts.length === 0) {
                console.log('ℹ️ No selected parts, skipping impact rendering');
                return;
            }

            // Emoji icons for impact levels
            const impactEmojis = {
                'mild': '✅',
                'moderate': '⚠️',
                'severe': '🔴',
                'critical': '🚨'
            };

            // Collect all unique impact descriptions from all selected parts
            const allImpacts = {
                mild: [],
                moderate: [],
                severe: [],
                critical: []
            };

            console.log('🔄 Gathering impacts from IMPACT_MATRIX...');

            // Gather impacts from all selected parts with validation
            selectedParts.forEach(part => {
                if (!part) {
                    console.warn('⚠️ Skipping null/undefined part');
                    return;
                }

                const impactSet = IMPACT_MATRIX[part] || IMPACT_MATRIX.default;
                if (!impactSet) {
                    console.warn(`⚠️ No impact set found for part: ${part}`);
                    return;
                }

                console.log(`✅ Found impact set for ${part}:`, Object.keys(impactSet));

                Object.keys(allImpacts).forEach(level => {
                    const impactData = impactSet[level];
                    if (impactData && impactData.title && impactData.description) {
                        allImpacts[level].push({
                            title: impactData.title,
                            description: impactData.description,
                            icon: impactData.icon || 'check-circle',
                            part: part
                        });
                    }
                });
            });

            console.log('📊 Collected impacts:', {
                mild: allImpacts.mild.length,
                moderate: allImpacts.moderate.length,
                severe: allImpacts.severe.length,
                critical: allImpacts.critical.length
            });

            // Find or create impact section with error handling
            let impactSection = step3.querySelector('.impact-section');
            if (!impactSection) {
                impactSection = document.createElement('div');
                impactSection.className = 'impact-section';
                // step3 IS the .step-content div, use it directly
                // Insert after selected parts display if it exists
                const selectedDisplay = step3.querySelector('.selected-parts-display');
                if (selectedDisplay) {
                    step3.insertBefore(impactSection, selectedDisplay.nextSibling);
                    console.log('✅ Impact section inserted after selected parts display');
                } else {
                    step3.insertBefore(impactSection, step3.firstChild);
                    console.log('✅ Impact section inserted at beginning of step3');
                }
            }

            // SVG icons for each impact level
            const svgIcons = {
                'check-circle': '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>',
                'alert-triangle': '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>',
                'alert-circle': '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>',
                'alert-octagon': '<path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2zm0-6h2v4h-2z"/>'
            };

            // Build deduplicated impact cards with validation
            const impactLevels = ['mild', 'moderate', 'severe', 'critical'];
            const cardsHTML = impactLevels.map(level => {
                const impacts = allImpacts[level];

                // Validate we have impacts for this level
                if (!impacts || impacts.length === 0) {
                    return ''; // Skip this level if no impacts
                }

                // Deduplicate descriptions using Set with comprehensive validation
                const validImpacts = impacts.filter(i =>
                    i &&
                    typeof i === 'object' &&
                    i.description &&
                    typeof i.description === 'string' &&
                    i.description.trim() !== ''
                );

                if (validImpacts.length === 0) return ''; // Skip if no valid impacts

                const uniqueDescriptions = [...new Set(validImpacts.map(i => i.description))];

                // Use the first valid impact's data
                const firstImpact = validImpacts[0];

                // Combine descriptions if multiple unique ones exist
                const combinedDescription = uniqueDescriptions.length > 1
                    ? uniqueDescriptions.join('; ')
                    : uniqueDescriptions[0];

                const emoji = impactEmojis[level] || '📍';

                return `
                    <div class="impact-card" data-impact="${level}" tabindex="0" role="button" aria-label="${emoji} ${firstImpact.title}: ${combinedDescription}">
                        <div class="impact-icon">
                            <svg viewBox="0 0 24 24">
                                ${svgIcons[firstImpact.icon] || svgIcons['check-circle']}
                            </svg>
                        </div>
                        <div class="impact-content">
                            <div class="impact-title">${emoji} ${firstImpact.title || level}</div>
                            <div class="impact-description">${combinedDescription}</div>
                        </div>
                    </div>
                `;
            }).filter(Boolean).join(''); // Remove empty cards

            console.log('🎨 Generated', cardsHTML.split('impact-card').length - 1, 'impact cards');

            impactSection.innerHTML = `
                <h3 class="section-title" data-i18n="impactLabel">${t('impactLabel') || 'Impact on Daily Life'}</h3>
                <div class="impact-options">
                    ${cardsHTML}
                </div>
            `;

            console.log('✅ Impact section HTML updated');

            // Add event delegation for impact card clicks
            const impactOptions = impactSection.querySelector('.impact-options');
            if (impactOptions) {
                // Remove old listeners by cloning
                const newImpactOptions = impactOptions.cloneNode(true);
                impactOptions.parentNode.replaceChild(newImpactOptions, impactOptions);

                // Add new event listener with delegation for clicks
                newImpactOptions.addEventListener('click', (e) => {
                    const card = e.target.closest('.impact-card');
                    if (card) {
                        const level = card.getAttribute('data-impact');
                        if (level) {
                            handleImpactSelect(level);
                        }
                    }
                });

                // Add keyboard navigation support
                newImpactOptions.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        const card = e.target.closest('.impact-card');
                        if (card) {
                            const level = card.getAttribute('data-impact');
                            if (level) {
                                handleImpactSelect(level);
                            }
                        }
                    }
                });
            }

            // Highlight selected impact if exists
            if (assessmentData.impactLevel) {
                const selectedCard = impactSection.querySelector(`[data-impact="${assessmentData.impactLevel}"]`);
                if (selectedCard) {
                    selectedCard.classList.add('selected');
                }
            }
        }

        // DYNAMIC SECTION RENDERING BASED ON BODY PART
        function renderDynamicSections(bodyPart) {
            const sectionConfig = CONTEXT_MATRIX[bodyPart];
            if (!sectionConfig) {
                console.log(`No specific configuration for ${bodyPart}, using default`);
                return;
            }

            // Render dynamic duration options (Step 2)
            renderDynamicDuration(sectionConfig.duration);

            // Render dynamic activities (Step 3)
            renderDynamicActivities(sectionConfig.activities);

            // Render context-specific questions (Step 3)
            renderContextQuestions(sectionConfig.duration.contextQuestions);
        }

        function renderDynamicDuration(durationConfig) {
            const step2 = document.getElementById('step2');
            const durationGrid = step2.querySelector('.options-grid');

            if (!durationGrid || !durationConfig) return;

            // Clear existing options
            durationGrid.innerHTML = '';

            // Add animation class
            durationGrid.style.opacity = '0';

            // Render new options
            durationConfig.options.forEach(option => {
                const card = document.createElement('div');
                card.className = 'option-card';
                card.setAttribute('data-duration', option);
                card.onclick = () => selectDuration(option);
                card.innerHTML = `
                    <div class="option-icon">
                        <svg viewBox="0 0 24 24">
                            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                        </svg>
                    </div>
                    <div class="option-text">${option}</div>
                `;
                durationGrid.appendChild(card);
            });

            // Fade in
            setTimeout(() => {
                durationGrid.style.transition = 'opacity 0.5s ease';
                durationGrid.style.opacity = '1';
            }, 100);
        }

        function renderDynamicActivities(activities) {
            const step3 = document.getElementById('step3');
            const activityGrid = step3.querySelector('.options-grid');

            if (!activityGrid || !activities) return;

            // Clear existing activities
            activityGrid.innerHTML = '';

            // Add animation
            activityGrid.style.opacity = '0';

            // Render new activities
            activities.forEach((activity, index) => {
                const activityId = activity.toLowerCase().replace(/\s+/g, '-');
                const card = document.createElement('div');
                card.className = 'option-card';
                card.setAttribute('data-activity', activityId);
                card.onclick = () => toggleActivity(activityId);

                const icons = [
                    '<path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/>',
                    '<path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>',
                    '<path d="M9 11.75c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm6 0c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-.29.02-.58.05-.86 2.36-1.05 4.23-2.98 5.21-5.37C11.07 8.33 14.05 10 17.42 10c.78 0 1.53-.09 2.25-.26.21.71.33 1.47.33 2.26 0 4.41-3.59 8-8 8z"/>',
                    '<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>',
                    '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>'
                ];

                card.innerHTML = `
                    <div class="option-icon">
                        <svg viewBox="0 0 24 24">${icons[index % icons.length]}</svg>
                    </div>
                    <div class="option-text">${activity}</div>
                `;
                activityGrid.appendChild(card);
            });

            // Fade in
            setTimeout(() => {
                activityGrid.style.transition = 'opacity 0.5s ease';
                activityGrid.style.opacity = '1';
            }, 100);
        }

        function renderContextQuestions(questions) {
            if (!questions || questions.length === 0) return;

            const step3 = document.getElementById('step3');
            let contextContainer = step3.querySelector('.context-questions-container');

            // Create container if it doesn't exist
            if (!contextContainer) {
                contextContainer = document.createElement('div');
                contextContainer.className = 'context-questions-container';
                contextContainer.style.opacity = '0';

                // Insert before the enhanced-inputs section
                const enhancedInputs = step3.querySelector('.enhanced-inputs');
                if (enhancedInputs) {
                    step3.insertBefore(contextContainer, enhancedInputs);
                }
            }

            // Clear existing questions
            contextContainer.innerHTML = '<h3 class="subsection-title">Additional Context</h3>';

            // Render questions with voice features
            questions.forEach((q, index) => {
                const questionDiv = document.createElement('div');
                questionDiv.className = 'context-question';
                questionDiv.innerHTML = `
                    <div class="question-header">
                        <label class="input-label">${q.label}</label>
                        <div class="voice-buttons">
                            <button class="voice-btn listen-btn" onclick="speakQuestion('${q.label.replace(/'/g, "\\'")}', event)" title="${t('voiceListen') || '🎧 Read Question'}">
                                <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;">
                                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                                </svg>
                            </button>
                            <button class="voice-btn speak-btn" onclick="startVoiceAnswerInput(${index}, event)" title="${t('voiceSpeak') || '🎤 Speak Answer'}">
                                <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;">
                                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="radio-group">
                        ${q.options.map((opt, i) => `
                            <label class="radio-label">
                                <input type="radio" name="contextQ${index}" value="${opt}" onchange="saveContextAnswer(${index}, '${opt}')">
                                <span>${opt}</span>
                            </label>
                        `).join('')}
                    </div>
                `;
                contextContainer.appendChild(questionDiv);
            });

            // Fade in
            setTimeout(() => {
                contextContainer.style.transition = 'opacity 0.5s ease';
                contextContainer.style.opacity = '1';
            }, 200);
        }

        function selectIntensity(level, save = true) {
            assessmentData.intensity = level;

            document.querySelectorAll('.intensity-level').forEach(el => el.classList.remove('selected'));
            document.querySelector(`[data-level="${level}"]`).classList.add('selected');

            checkStep1Complete();
            if (save) saveSession();
            speak(`${level} pain intensity selected`);
        }

        function checkStep1Complete() {
            const nextBtn = document.getElementById('nextBtn');
            nextBtn.disabled = !(assessmentData.bodyPart && assessmentData.intensity);
        }

        // DURATION
        function selectDuration(duration) {
            console.log('🕐 selectDuration() called with:', duration);
            assessmentData.duration = duration;

            document.querySelectorAll('[data-duration]').forEach(card => card.classList.remove('selected'));
            const selectedCard = document.querySelector(`[data-duration="${duration}"]`);
            if (selectedCard) {
                selectedCard.classList.add('selected');
                console.log('✅ Duration card selected:', duration);
            } else {
                console.error('❌ Duration card not found for:', duration);
            }

            const nextBtn = document.getElementById('nextBtn');
            if (nextBtn) {
                nextBtn.disabled = false;
                console.log('✅ Next button enabled');
            }

            saveSession();
            speak(`${duration} selected`);
        }

        // ACTIVITY
        function toggleActivity(activity) {
            const index = assessmentData.activities.indexOf(activity);
            const card = document.querySelector(`[data-activity="${activity}"]`);

            if (index > -1) {
                assessmentData.activities.splice(index, 1);
                card.classList.remove('selected');
            } else {
                assessmentData.activities.push(activity);
                card.classList.add('selected');
            }

            document.getElementById('nextBtn').disabled = assessmentData.activities.length === 0;
            saveSession();
        }

        // NAVIGATION
        function nextStep() {
            const currentStep = assessmentData.currentStep;

            if (currentStep === 3) {
                // Collect enhanced input fields before AI analysis
                const painFrequency = document.getElementById('painFrequency')?.value || '';
                const painType = document.querySelector('input[name="painType"]:checked')?.value || '';
                const durationMonths = document.getElementById('durationSlider')?.value || 3;
                const activityTriggers = Array.from(document.querySelectorAll('input[name="activityTrigger"]:checked'))
                    .map(el => el.value);
                const additionalNotes = document.getElementById('additionalNotes')?.value || '';

                assessmentData.painFrequency = painFrequency;
                assessmentData.painType = painType;
                assessmentData.durationMonths = parseInt(durationMonths);
                assessmentData.activityTriggers = activityTriggers;
                assessmentData.additionalNotes = additionalNotes;

                saveSession();
                runAIAnalysis();
                return;
            }

            if (currentStep === 4) {
                window.location.href = '/book-consultation';  // Update with your booking URL
                return;
            }

            assessmentData.currentStep++;
            updateStepDisplay();
            saveSession();
        }

        function previousStep() {
            if (assessmentData.currentStep > 1) {
                assessmentData.currentStep--;
                updateStepDisplay();
            }
        }

        function goToStep(step) {
            // Allow navigation to completed steps only
            if (step <= assessmentData.currentStep || assessmentData.currentStep === 4) {
                assessmentData.currentStep = step;
                updateStepDisplay();
            }
        }

        function updateStepDisplay() {
            const step = assessmentData.currentStep;

            updateProgress();

            document.querySelectorAll('.step-content').forEach(content => content.classList.remove('active'));
            document.getElementById(`step${step}`).classList.add('active');

            document.getElementById('backBtn').style.display = step > 1 ? 'inline-flex' : 'none';

            checkNextButtonState();
            updateNextButton();

            const titleElement = document.getElementById(`step${step}Title`);
            if (titleElement) {
                speak(titleElement.textContent);
            }

            // Render AI-powered impact section when entering Step 3
            if (step === 3) {
                // Handle both multi-part and single-part selection
                const hasMultiParts = assessmentData.selectedParts && assessmentData.selectedParts.length > 0;
                const hasSinglePart = assessmentData.bodyPart;

                if (hasMultiParts || hasSinglePart) {
                    console.log('📍 Entering Step 3, rendering AI impact section...');

                    // If using single part system, convert to array for AI generation
                    if (hasSinglePart && !hasMultiParts) {
                        assessmentData.selectedParts = [assessmentData.bodyPart];
                    }

                    renderAIImpactSection();
                }
            }
        }

        function checkNextButtonState() {
            const step = assessmentData.currentStep;
            let enabled = false;

            switch(step) {
                case 1:
                    enabled = assessmentData.bodyPart && assessmentData.intensity;
                    break;
                case 2:
                    enabled = assessmentData.duration !== null;
                    break;
                case 3:
                    enabled = assessmentData.activities.length > 0;
                    break;
                case 4:
                    enabled = true;
                    break;
            }

            document.getElementById('nextBtn').disabled = !enabled;
        }

        function updateProgress() {
            const step = assessmentData.currentStep;
            const percentage = ((step - 1) / (assessmentData.totalSteps - 1)) * 100;

            // Update main progress bar
            const progressLineFill = document.getElementById('progressLineFill');
            if (progressLineFill) {
                progressLineFill.style.width = `${percentage}%`;
            }

            // Update all progress steps (both main and sticky header)
            document.querySelectorAll('.progress-step').forEach((stepEl, index) => {
                stepEl.classList.remove('active', 'completed');

                if (index + 1 < step) {
                    stepEl.classList.add('completed');
                } else if (index + 1 === step) {
                    stepEl.classList.add('active');
                }
            });

            // Update sticky progress header
            const stickyHeader = document.getElementById('stickyProgressHeader');
            const progressBarFill = document.getElementById('progressBarFill');

            if (stickyHeader && progressBarFill) {
                // Show sticky header after step 1
                if (step > 1) {
                    stickyHeader.style.display = 'block';
                } else {
                    stickyHeader.style.display = 'none';
                }

                // Update progress bar fill
                const stickyPercentage = (step / assessmentData.totalSteps) * 100;
                progressBarFill.style.width = `${stickyPercentage}%`;
            }
        }

        function updateNextButton() {
            const step = assessmentData.currentStep;
            const nextBtnText = document.getElementById('nextBtnText');
            const nextBtn = document.getElementById('nextBtn');

            if (step === 3) {
                nextBtnText.textContent = t('analyzeBtn');
                if (nextBtn && !nextBtn.disabled) {
                    nextBtn.classList.add('pulse');
                }
            } else if (step === 4) {
                nextBtnText.textContent = t('bookBtn');
                if (nextBtn) nextBtn.classList.remove('pulse');
            } else {
                nextBtnText.textContent = t('continueBtn');
                if (nextBtn) nextBtn.classList.remove('pulse');
            }
        }

        // AI ANALYSIS WITH REAL OPENAI
        async function runAIAnalysis() {
            // Safe DOM element access with null checks
            const step3 = document.getElementById('step3');
            const loadingScreen = document.getElementById('loadingScreen');
            const nextBtn = document.getElementById('nextBtn');
            const backBtn = document.getElementById('backBtn');
            const aiResults = document.getElementById('aiResults');

            // Hide step 3 and show loading
            if (step3) step3.classList.remove('active');
            if (loadingScreen) loadingScreen.classList.add('active');
            if (nextBtn) nextBtn.style.display = 'none';
            if (backBtn) backBtn.style.display = 'none';

            speak('Analyzing your pain profile with AI');

            try {
                const prompt = buildPhysiotherapyPrompt();
                const aiResponse = await callOpenAI(prompt);

                if (aiResponse) {
                    // Translate AI response if not in English
                    const translatedResponse = await translateAIResponse(aiResponse);

                    assessmentData.aiResponse = translatedResponse;
                    assessmentData.aiMessages = parseAIResponse(translatedResponse);
                } else {
                    assessmentData.aiMessages = getLocalAnalysis();
                }

            } catch (error) {
                console.error('AI Analysis error:', error);
                assessmentData.aiMessages = getLocalAnalysis();
            }

            setTimeout(() => {
                displayAIChatResults();

                // Hide loading and show results
                if (loadingScreen) loadingScreen.classList.remove('active');
                if (aiResults) aiResults.classList.add('active');
                if (nextBtn) {
                    nextBtn.style.display = 'inline-flex';
                    nextBtn.disabled = false;
                }

                assessmentData.currentStep = 4;
                updateProgress();
                updateNextButton();

                saveSession();
            }, 2000);
        }

        function parseAIResponse(aiText) {
            const messages = [];

            const sections = [
                { title: 'Initial Assessment', icon: '<svg viewBox="0 0 24 24" style="width:18px;height:18px;vertical-align:middle;margin-right:6px;fill:currentColor;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>' },
                { title: 'Diagnosis & Analysis', icon: '<svg viewBox="0 0 24 24" style="width:18px;height:18px;vertical-align:middle;margin-right:6px;fill:currentColor;"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>' },
                { title: 'Recovery Timeline', icon: '<svg viewBox="0 0 24 24" style="width:18px;height:18px;vertical-align:middle;margin-right:6px;fill:currentColor;"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>' },
                { title: 'Treatment Plan', icon: '<svg viewBox="0 0 24 24" style="width:18px;height:18px;vertical-align:middle;margin-right:6px;fill:currentColor;"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>' }
            ];

            sections.forEach(section => {
                const regex = new RegExp(`${section.title}[:\\n]+([\\s\\S]*?)(?=(?:Initial Assessment|Diagnosis|Recovery Timeline|Treatment Plan)|$)`, 'i');
                const match = aiText.match(regex);

                if (match && match[1]) {
                    messages.push({
                        title: `${section.icon} ${section.title}`,
                        content: match[1].trim()
                    });
                }
            });

            if (messages.length === 0) {
                messages.push({
                    title: '<svg viewBox="0 0 24 24" style="width:18px;height:18px;vertical-align:middle;margin-right:6px;fill:currentColor;"><path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zM7.5 11.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5zM16 17H8v-2h8v2zm-1-4c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z"/></svg> AI Analysis',
                    content: aiText
                });
            }

            return messages;
        }

        function getLocalAnalysis() {
            return [
                {
                    title: '<svg viewBox="0 0 24 24" style="width:18px;height:18px;vertical-align:middle;margin-right:6px;fill:currentColor;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Initial Assessment',
                    content: `Based on your ${assessmentData.intensityLabel} ${assessmentData.bodyPart} pain that's been present for ${assessmentData.duration}, I've analyzed your condition. The fact that it affects ${assessmentData.activities.join(', ')} suggests we need to address this carefully.`
                },
                {
                    title: '<svg viewBox="0 0 24 24" style="width:18px;height:18px;vertical-align:middle;margin-right:6px;fill:currentColor;"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg> Diagnosis',
                    content: `You likely have ${assessmentData.intensityLabel === 'severe' ? 'significant soft tissue involvement' : 'muscle strain or minor soft tissue injury'}. This is common and treatable with proper care. The pattern suggests potential inflammation and possibly some compensatory movement patterns.`
                },
                {
                    title: '<svg viewBox="0 0 24 24" style="width:18px;height:18px;vertical-align:middle;margin-right:6px;fill:currentColor;"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg> Recovery Timeline',
                    content: `Expected recovery: ${assessmentData.intensityLabel === 'severe' ? '6-12 weeks' : '2-4 weeks'} with consistent treatment. Most patients see significant improvement within the first 2 weeks. Week 1-2: Pain reduction, Week 3-4: Function restoration, Beyond: Strengthening phase.`
                },
                {
                    title: '<svg viewBox="0 0 24 24" style="width:18px;height:18px;vertical-align:middle;margin-right:6px;fill:currentColor;"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg> Treatment Plan',
                    content: "I recommend: 1) Professional physiotherapy evaluation, 2) Targeted strengthening exercises (progressive loading), 3) Pain management techniques (ice/heat therapy), 4) Lifestyle modifications to avoid aggravating activities, 5) Gradual return to normal function."
                }
            ];
        }

        // AI CHAT DISPLAY WITH TYPING INDICATOR
        function displayAIChatResults() {
            const chatContainer = document.getElementById('chatMessages');
            if (!chatContainer) {
                console.error('Chat container not found');
                return;
            }

            chatContainer.innerHTML = '';

            assessmentData.aiMessages.forEach((msg, index) => {
                setTimeout(() => {
                    // Show typing indicator
                    const typingIndicator = document.getElementById('typingIndicator');
                    if (typingIndicator) {
                        typingIndicator.style.display = 'inline-flex';
                    }

                    setTimeout(() => {
                        // Hide typing indicator
                        if (typingIndicator) {
                            typingIndicator.style.display = 'none';
                        }

                        // Show message
                        const messageEl = document.createElement('div');
                        messageEl.className = 'chat-message';
                        messageEl.style.animationDelay = `${index * 0.1}s`;

                        messageEl.innerHTML = `
                            <div class="chat-avatar">
                                <svg viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                                </svg>
                            </div>
                            <div class="chat-bubble">
                                <div class="message-title">${msg.title}</div>
                                <div class="message-content" id="msg${index}"></div>
                            </div>
                        `;

                        if (chatContainer) {
                            chatContainer.appendChild(messageEl);
                        }

                        // Typing effect
                        typeMessage(msg.content, `msg${index}`, 20);

                        // Speak message
                        setTimeout(() => speak(msg.content), 300);
                    }, 1500); // Typing indicator duration
                }, index * 3500);
            });

            // Show summary card, charts, tips, and feedback after all messages
            setTimeout(() => {
                showSummaryCard();
                showCharts();
                generateDailyTips();

                const followUpSection = document.getElementById('followUpSection');
                const feedbackSection = document.getElementById('feedbackSection');

                if (followUpSection) followUpSection.style.display = 'block';
                if (feedbackSection) feedbackSection.style.display = 'block';
            }, 12000);
        }

        function typeMessage(text, elementId, speed) {
            const element = document.getElementById(elementId);
            if (!element) return;

            let i = 0;

            function type() {
                if (i < text.length && element) {
                    element.textContent += text.charAt(i);
                    i++;
                    setTimeout(type, speed);
                }
            }

            type();
        }

        // SUMMARY CARD
        function showSummaryCard() {
            const summaryCard = document.getElementById('summaryCard');
            const summaryDate = document.getElementById('summaryDate');
            const summaryArea = document.getElementById('summaryArea');
            const summaryLevel = document.getElementById('summaryLevel');
            const summaryDuration = document.getElementById('summaryDuration');
            const summaryRecovery = document.getElementById('summaryRecovery');

            if (summaryCard) summaryCard.style.display = 'block';
            if (summaryDate) summaryDate.textContent = new Date().toLocaleDateString();
            if (summaryArea && assessmentData.bodyPart) {
                summaryArea.textContent = assessmentData.bodyPart.charAt(0).toUpperCase() + assessmentData.bodyPart.slice(1);
            }
            if (summaryLevel && assessmentData.intensity) {
                summaryLevel.textContent = assessmentData.intensity.charAt(0).toUpperCase() + assessmentData.intensity.slice(1);
            }
            if (summaryDuration && assessmentData.duration) {
                summaryDuration.textContent = assessmentData.duration.charAt(0).toUpperCase() + assessmentData.duration.slice(1);
            }
            if (summaryRecovery) {
                summaryRecovery.textContent = assessmentData.intensity === 'severe' ? '6-12 weeks' : '2-4 weeks';
            }

            // Add context summary chips
            showContextChips();
        }

        function showContextChips() {
            const summaryCard = document.getElementById('summaryCard');
            if (!summaryCard) return;

            // Remove existing chips if any
            let chipsContainer = summaryCard.querySelector('.context-chips');
            if (chipsContainer) {
                chipsContainer.remove();
            }

            // Create new chips container
            chipsContainer = document.createElement('div');
            chipsContainer.className = 'context-chips';

            // Prepare chip data
            const chips = [];

            if (assessmentData.painType) {
                chips.push({
                    icon: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>',
                    label: `${assessmentData.painType} pain`
                });
            }

            if (assessmentData.painFrequency) {
                chips.push({
                    icon: '<path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>',
                    label: assessmentData.painFrequency
                });
            }

            if (assessmentData.activities && assessmentData.activities.length > 0) {
                chips.push({
                    icon: '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>',
                    label: `${assessmentData.activities.length} activities affected`
                });
            }

            if (assessmentData.durationMonths) {
                chips.push({
                    icon: '<path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>',
                    label: `${assessmentData.durationMonths} ${assessmentData.durationMonths === 1 ? 'month' : 'months'}`
                });
            }

            const confidence = assessmentData.intensity === 'severe' ? 'High confidence' : 'Moderate confidence';
            chips.push({
                icon: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>',
                label: confidence
            });

            // Render chips
            chips.forEach(chip => {
                const chipEl = document.createElement('div');
                chipEl.className = 'context-chip';
                chipEl.innerHTML = `
                    <svg viewBox="0 0 24 24">${chip.icon}</svg>
                    <span>${chip.label}</span>
                `;
                chipsContainer.appendChild(chipEl);
            });

            // Insert chips after summary grid
            const summaryActions = summaryCard.querySelector('.summary-actions');
            if (summaryActions) {
                summaryCard.insertBefore(chipsContainer, summaryActions);
            } else {
                summaryCard.appendChild(chipsContainer);
            }
        }

        // PDF DOWNLOAD
        function downloadPDF() {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Header
            doc.setFontSize(20);
            doc.setTextColor(243, 112, 33);
            doc.text('Pain Assessment Report', 20, 20);

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 30);
            doc.text(`Session ID: ${assessmentData.sessionId}`, 20, 35);

            // Summary
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text('Assessment Summary', 20, 50);

            doc.setFontSize(11);
            doc.text(`Affected Area: ${assessmentData.bodyPart}`, 20, 60);
            doc.text(`Pain Level: ${assessmentData.intensity}`, 20, 67);
            doc.text(`Duration: ${assessmentData.duration}`, 20, 74);
            doc.text(`Recovery Estimate: ${assessmentData.intensity === 'severe' ? '6-12 weeks' : '2-4 weeks'}`, 20, 81);

            // Affected Activities
            doc.text('Affected Activities:', 20, 95);
            assessmentData.activities.forEach((activity, index) => {
                doc.text(`• ${activity}`, 25, 102 + (index * 7));
            });

            // Recommendations
            doc.setFontSize(14);
            doc.text('Recommendations', 20, 130);

            doc.setFontSize(11);
            const recommendations = [
                '• Consult with a professional physiotherapist',
                '• Follow prescribed exercise routine',
                '• Apply heat/ice therapy as recommended',
                '• Maintain proper posture and ergonomics',
                '• Gradual return to normal activities'
            ];

            recommendations.forEach((rec, index) => {
                doc.text(rec, 20, 140 + (index * 7));
            });

            // Footer
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text('Generated by Physiosmetic AI Pain Assessment', 20, 280);
            doc.text('This report is for informational purposes only. Consult a healthcare professional.', 20, 285);

            doc.save(`Pain-Assessment-${Date.now()}.pdf`);

            speak('PDF downloaded successfully');
        }

        // SHARE WITH DOCTOR
        function shareWithDoctor() {
            const reportData = {
                ...assessmentData,
                summaryUrl: window.location.href
            };

            const emailSubject = encodeURIComponent('Pain Assessment Report');
            const emailBody = encodeURIComponent(
                `Pain Assessment Report\n\n` +
                `Affected Area: ${assessmentData.bodyPart}\n` +
                `Pain Level: ${assessmentData.intensity}\n` +
                `Duration: ${assessmentData.duration}\n` +
                `Recovery Estimate: ${assessmentData.intensity === 'severe' ? '6-12 weeks' : '2-4 weeks'}\n\n` +
                `Session ID: ${assessmentData.sessionId}\n` +
                `Date: ${new Date().toLocaleDateString()}`
            );

            window.location.href = `mailto:?subject=${emailSubject}&body=${emailBody}`;

            speak('Opening email to share with doctor');
        }

        // CHART.JS VISUALIZATIONS
        function showCharts() {
            const recoveryChart = document.getElementById('recoveryChart');
            const confidenceChart = document.getElementById('confidenceChart');

            if (recoveryChart) recoveryChart.style.display = 'block';
            if (confidenceChart) confidenceChart.style.display = 'block';

            setTimeout(() => createForecastChart(), 500);
            setTimeout(() => createConfidenceChart(), 1000);
        }

        function createForecastChart() {
            const canvas = document.getElementById('forecastCanvas');
            if (!canvas) {
                console.error('Forecast canvas not found');
                return;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const weeks = assessmentData.intensity === 'severe' ? 12 : 6;
            const labels = Array.from({length: weeks}, (_, i) => `Week ${i + 1}`);
            const data = Array.from({length: weeks}, (_, i) => {
                const progress = (i + 1) / weeks;
                return Math.min(100, 10 + (90 * Math.pow(progress, 0.7)));
            });

            forecastChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Recovery Progress (%)',
                        data: data,
                        borderColor: 'rgba(243, 112, 33, 1)',
                        backgroundColor: 'rgba(243, 112, 33, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: 'rgba(243, 112, 33, 1)',
                        borderWidth: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            labels: {
                                color: 'rgba(255, 255, 255, 0.7)',
                                font: {
                                    family: 'Inter',
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(10, 15, 25, 0.95)',
                            titleColor: 'rgba(243, 112, 33, 1)',
                            bodyColor: 'rgba(255, 255, 255, 0.9)',
                            borderColor: 'rgba(243, 112, 33, 0.5)',
                            borderWidth: 1,
                            padding: 12,
                            displayColors: false,
                            callbacks: {
                                label: function(context) {
                                    return `Recovery: ${Math.round(context.parsed.y)}%`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.5)',
                                callback: function(value) {
                                    return value + '%';
                                }
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.05)'
                            }
                        },
                        x: {
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.5)'
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.05)'
                            }
                        }
                    },
                    animation: {
                        duration: 2000,
                        easing: 'easeInOutQuart'
                    }
                }
            });
        }

        function createConfidenceChart() {
            const canvas = document.getElementById('confidenceCanvas');
            if (!canvas) {
                console.error('Confidence canvas not found');
                return;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const confidence = 85 + Math.floor(Math.random() * 10);
            const remaining = 100 - confidence;

            confidenceChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Confidence', 'Margin'],
                    datasets: [{
                        data: [confidence, remaining],
                        backgroundColor: [
                            'rgba(16, 185, 129, 0.8)',
                            'rgba(255, 255, 255, 0.05)'
                        ],
                        borderColor: [
                            'rgba(16, 185, 129, 1)',
                            'rgba(255, 255, 255, 0.1)'
                        ],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(10, 15, 25, 0.95)',
                            titleColor: 'rgba(16, 185, 129, 1)',
                            bodyColor: 'rgba(255, 255, 255, 0.9)',
                            borderColor: 'rgba(16, 185, 129, 0.5)',
                            borderWidth: 1,
                            padding: 12,
                            callbacks: {
                                label: function(context) {
                                    return `${context.label}: ${context.parsed}%`;
                                }
                            }
                        }
                    },
                    animation: {
                        duration: 2000,
                        easing: 'easeInOutQuart'
                    }
                },
                plugins: [{
                    id: 'centerText',
                    afterDraw: function(chart) {
                        const ctx = chart.ctx;
                        ctx.save();
                        const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
                        const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;

                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.font = 'bold 32px Space Grotesk';
                        ctx.fillStyle = 'rgba(16, 185, 129, 1)';
                        ctx.fillText(`${confidence}%`, centerX, centerY - 10);

                        ctx.font = '14px Inter';
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                        ctx.fillText('Confidence', centerX, centerY + 20);
                        ctx.restore();
                    }
                }]
            });
        }

        // DAILY TIPS
        const tipsDatabase = {
            neck: {
                mild: [
                    { icon: 'M12 2l-5 9h10l-5-9zm0 3.84L13.93 9h-3.87L12 5.84z', title: 'Gentle Stretches', text: 'Perform neck rotations every 2 hours - 10 reps each direction' },
                    { icon: 'M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z', title: 'Ergonomic Setup', text: 'Position screen at eye level to reduce neck strain' },
                    { icon: 'M12 2C8.69 2 6 4.69 6 8c0 1.5.55 2.86 1.46 3.91-.07.14-.16.28-.23.42-.19.38-.28.77-.28 1.17 0 .66.15 1.29.43 1.88L9 19h6l1.62-3.62c.28-.59.43-1.22.43-1.88 0-.4-.09-.79-.28-1.17-.07-.14-.16-.28-.23-.42C17.45 10.86 18 9.5 18 8c0-3.31-2.69-6-6-6z', title: 'Heat Therapy', text: 'Apply warm compress for 15 minutes, 3x daily' }
                ],
                severe: [
                    { icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z', title: 'Ice Application', text: 'Apply ice pack for 15-20 minutes every 3-4 hours' },
                    { icon: 'M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z', title: 'Sleep Position', text: 'Use a supportive pillow that keeps neck neutral' },
                    { icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z', title: 'Avoid Strain', text: 'Minimize looking down at phone - hold at eye level' }
                ]
            },
            // Add more body parts as needed
        };

        function generateDailyTips() {
            const tipsGrid = document.getElementById('tipsGrid');
            const dailyTips = document.getElementById('dailyTips');

            if (!tipsGrid) {
                console.error('Tips grid not found');
                return;
            }

            const bodyPart = assessmentData.bodyPart || 'neck';
            const severity = assessmentData.intensity === 'severe' ? 'severe' : 'mild';

            const tips = tipsDatabase[bodyPart]?.[severity] || tipsDatabase.neck?.mild || [];

            tipsGrid.innerHTML = '';

            tips.forEach((tip, index) => {
                setTimeout(() => {
                    const tipCard = document.createElement('div');
                    tipCard.className = 'tip-card';
                    tipCard.style.animation = `slideIn 0.5s ease ${index * 0.2}s both`;

                    tipCard.innerHTML = `
                        <div class="tip-icon">
                            <svg viewBox="0 0 24 24">
                                <path d="${tip.icon || ''}"/>
                            </svg>
                        </div>
                        <div class="tip-content">
                            <div class="tip-title">${tip.title || ''}</div>
                            <div class="tip-text">${tip.text || ''}</div>
                        </div>
                    `;

                    if (tipsGrid) {
                        tipsGrid.appendChild(tipCard);
                    }
                }, index * 300);
            });

            if (dailyTips) dailyTips.style.display = 'block';
        }

        // FOLLOW-UP QUESTIONS
        // Conversation history for follow-up chat
        let followUpConversation = [];
        let mediaRecorder = null;
        let audioChunks = [];

        // OPENAI WHISPER VOICE INPUT
        async function startVoiceInput() {
            const micBtn = document.getElementById('micBtn');
            const followUpInput = document.getElementById('followUpInput');

            // If already recording, stop
            if (micBtn.classList.contains('recording')) {
                if (mediaRecorder && mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
                micBtn.classList.remove('recording');
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.addEventListener('dataavailable', event => {
                    audioChunks.push(event.data);
                });

                mediaRecorder.addEventListener('stop', async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

                    // Convert to format suitable for Whisper API
                    const formData = new FormData();
                    formData.append('file', audioBlob, 'recording.webm');
                    formData.append('model', API_CONFIG.whisper.model);
                    formData.append('language', assessmentData.currentLanguage);

                    // Show processing state
                    followUpInput.placeholder = 'Transcribing...';
                    followUpInput.disabled = true;

                    try {
                        if (API_CONFIG.openai.key) {
                            const response = await fetch(API_CONFIG.whisper.endpoint, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${API_CONFIG.openai.key}`
                                },
                                body: formData
                            });

                            if (response.ok) {
                                const data = await response.json();
                                followUpInput.value = data.text;
                                followUpInput.disabled = false;
                                followUpInput.placeholder = t('followUpPlaceholder');

                                // Auto-submit the transcribed text
                                setTimeout(() => askFollowUp(), 500);
                            } else {
                                console.error('Whisper API error:', await response.text());
                                alert('Voice transcription failed. Please check your API key.');
                                followUpInput.disabled = false;
                                followUpInput.placeholder = t('followUpPlaceholder');
                            }
                        } else {
                            alert('OpenAI API key required for voice input.');
                            followUpInput.disabled = false;
                            followUpInput.placeholder = t('followUpPlaceholder');
                        }
                    } catch (error) {
                        console.error('Error transcribing audio:', error);
                        alert('Voice transcription failed: ' + error.message);
                        followUpInput.disabled = false;
                        followUpInput.placeholder = t('followUpPlaceholder');
                    }

                    // Stop all tracks
                    stream.getTracks().forEach(track => track.stop());
                });

                mediaRecorder.start();
                micBtn.classList.add('recording');
                followUpInput.placeholder = 'Recording... Click mic to stop';

            } catch (error) {
                console.error('Error accessing microphone:', error);
                alert('Could not access microphone. Please check permissions.');
            }
        }

        async function askFollowUp() {
            const input = document.getElementById('followUpInput');
            const question = input.value.trim();

            if (!question) return;

            const chatContainer = document.getElementById('followUpChatContainer');
            input.value = '';
            input.disabled = true;

            // Add user message to UI
            const userMessage = document.createElement('div');
            userMessage.className = 'chat-message-user';
            userMessage.textContent = question;
            chatContainer.appendChild(userMessage);

            // Add to conversation history
            followUpConversation.push({
                role: 'user',
                content: question
            });

            // Scroll to bottom
            chatContainer.scrollTop = chatContainer.scrollHeight;

            // Show typing indicator
            const typingIndicator = document.createElement('div');
            typingIndicator.className = 'chat-typing-indicator';
            typingIndicator.id = 'followUpTyping';
            typingIndicator.innerHTML = '<span></span><span></span><span></span>';
            chatContainer.appendChild(typingIndicator);

            // Scroll to show typing indicator
            chatContainer.scrollTop = chatContainer.scrollHeight;

            // Call OpenAI API with conversation context
            let answer = `Based on your ${assessmentData.bodyPart} pain assessment, I recommend consulting with a healthcare professional for personalized advice.`;

            try {
                if (API_CONFIG.openai.key) {
                    // Build context message
                    const contextMessage = `Patient has ${assessmentData.intensityLabel} ${assessmentData.bodyPart} pain for ${assessmentData.duration}. Pain type: ${assessmentData.painType || 'unspecified'}. Frequency: ${assessmentData.painFrequency || 'unspecified'}. Activities affected: ${assessmentData.activities.join(', ') || 'none specified'}.`;

                    const messages = [
                        {
                            role: 'system',
                            content: 'You are an expert physiotherapist assistant. Provide helpful, evidence-based advice about pain management and exercises. Keep responses concise (2-3 sentences) and friendly.'
                        },
                        {
                            role: 'assistant',
                            content: contextMessage
                        },
                        ...followUpConversation
                    ];

                    const response = await fetch(API_CONFIG.openai.endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${API_CONFIG.openai.key}`
                        },
                        body: JSON.stringify({
                            model: API_CONFIG.openai.model,
                            messages: messages,
                            max_tokens: 200,
                            temperature: 0.7
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        answer = data.choices[0].message.content.trim();
                    }
                }
            } catch (error) {
                console.error('Error getting follow-up response:', error);
            }

            // Remove typing indicator
            setTimeout(() => {
                const typing = document.getElementById('followUpTyping');
                if (typing) typing.remove();

                // Add AI response
                const aiMessage = document.createElement('div');
                aiMessage.className = 'chat-message-ai';
                aiMessage.textContent = answer;
                chatContainer.appendChild(aiMessage);

                // Add to conversation history
                followUpConversation.push({
                    role: 'assistant',
                    content: answer
                });

                // Scroll to bottom
                chatContainer.scrollTop = chatContainer.scrollHeight;

                // Re-enable input
                input.disabled = false;
                input.focus();

                // Speak the response
                if (assessmentData.voiceEnabled) {
                    speak(answer);
                }
            }, 1500);
        }

        // FEEDBACK
        function submitFeedback(type) {
            document.querySelectorAll('.feedback-btn').forEach(btn => btn.classList.remove('selected'));
            event.target.closest('.feedback-btn').classList.add('selected');

            document.getElementById('feedbackMessage').style.display = 'block';

            // Send to API
            callAPI('submitFeedback', {
                sessionId: assessmentData.sessionId,
                feedback: type,
                data: assessmentData
            });

            speak('Thank you for your feedback');
        }

        // LANGUAGE SWITCHING (Simplified)
        // TRANSLATION HELPER FUNCTION
        function t(key, lang = null) {
            // Use provided language or current language
            const targetLang = lang || assessmentData.currentLanguage;

            // Normalize language code (e.g., "mr-IN" → "mr")
            const normalizedLang = normalizeLangCode(targetLang);

            // Ensure TRANSLATIONS is loaded
            if (typeof TRANSLATIONS === 'undefined') {
                console.warn('TRANSLATIONS not loaded');
                return key;
            }

            // Try current language, fallback to English, then return key
            return TRANSLATIONS[normalizedLang]?.[key] || TRANSLATIONS.en?.[key] || key;
        }

        // Normalize language code helper
        function normalizeLangCode(code) {
            if (!code) return 'en';
            // Extract base language code (mr-IN → mr, en-US → en)
            return code.split('-')[0].toLowerCase();
        }

        function applyTranslations(lang = null) {
            console.log('🌐 applyTranslations() START');
            console.log('  Input lang:', lang);

            // Use specified language or current language
            const targetLang = lang || assessmentData.currentLanguage;
            const normalizedLang = normalizeLangCode(targetLang);
            console.log('  Target lang:', targetLang, '→ Normalized:', normalizedLang);

            // Ensure we're using the normalized language
            if (assessmentData.currentLanguage !== normalizedLang) {
                assessmentData.currentLanguage = normalizedLang;
            }

            // Test translation function
            const testTranslation = t('headerTitle', normalizedLang);
            console.log('  Test translation t("headerTitle"):', testTranslation);

            // Header
            const headerTitle = document.getElementById('headerTitle');
            const headerSubtitle = document.getElementById('headerSubtitle');
            if (headerTitle) {
                const newText = t('headerTitle');
                console.log('  🔍 headerTitle translation: EN="' + TRANSLATIONS.en.headerTitle + '" → ' + normalizedLang + '="' + newText + '"');
                headerTitle.textContent = newText;
                console.log('  ✅ Updated headerTitle element to:', headerTitle.textContent);
            } else {
                console.error('  ❌ headerTitle element NOT FOUND!');
            }
            if (headerSubtitle) {
                const newText = t('headerSubtitle');
                headerSubtitle.textContent = newText;
                console.log('  ✅ Updated headerSubtitle to:', headerSubtitle.textContent);
            }

            // Step titles and descriptions
            const step1Title = document.getElementById('step1Title');
            const step1Description = document.getElementById('step1Description');
            const step2Title = document.getElementById('step2Title');
            const step2Description = document.getElementById('step2Description');
            const step3Title = document.getElementById('step3Title');
            const step3Description = document.getElementById('step3Description');

            if (step1Title) {
                step1Title.textContent = t('step1Title');
                console.log('  ✅ Updated step1Title to:', step1Title.textContent);
            }
            if (step1Description) step1Description.textContent = t('step1Description');
            if (step2Title) step2Title.textContent = t('step2Title');
            if (step2Description) step2Description.textContent = t('step2Description');
            if (step3Title) step3Title.textContent = t('step3Title');
            if (step3Description) step3Description.textContent = t('step3Description');

            // Step 3 form labels
            document.querySelectorAll('.input-label').forEach((label, index) => {
                const labels = ['painFrequencyLabel', 'painTypeLabel', 'durationMonthsLabel', 'activityTriggersLabel', 'additionalNotesLabel'];
                if (labels[index]) {
                    label.textContent = t(labels[index]);
                }
            });

            // Pain frequency options
            const painFrequency = document.getElementById('painFrequency');
            if (painFrequency) {
                painFrequency.options[0].text = t('painFrequencyPlaceholder');
                painFrequency.options[1].text = t('painFrequencyOccasional');
                painFrequency.options[2].text = t('painFrequencyFrequent');
                painFrequency.options[3].text = t('painFrequencyConstant');
            }

            // Pain type labels
            const painTypeLabels = document.querySelectorAll('.radio-label span');
            const painTypes = ['painTypeDull', 'painTypeSharp', 'painTypeThrobbing', 'painTypeBurning'];
            painTypeLabels.forEach((span, index) => {
                if (painTypes[index]) {
                    span.textContent = t(painTypes[index]);
                }
            });

            // Activity triggers
            const triggerLabels = document.querySelectorAll('.checkbox-label span');
            const triggers = ['triggerWalking', 'triggerSitting', 'triggerSleeping', 'triggerExercise', 'triggerStanding', 'triggerBending'];
            triggerLabels.forEach((span, index) => {
                if (triggers[index]) {
                    span.textContent = t(triggers[index]);
                }
            });

            // Additional notes placeholder
            const additionalNotes = document.getElementById('additionalNotes');
            if (additionalNotes) {
                additionalNotes.placeholder = t('additionalNotesPlaceholder');
            }

            // Subsection
            const subsectionTitle = document.querySelector('.subsection-title');
            if (subsectionTitle) {
                subsectionTitle.textContent = t('subsectionTitle');
            }

            // Activity cards
            const activityWork = document.getElementById('activityWork');
            const activityExercise = document.getElementById('activityExercise');
            const activitySleep = document.getElementById('activitySleep');
            const activityDaily = document.getElementById('activityDaily');

            if (activityWork) activityWork.textContent = t('activityWork');
            if (activityExercise) activityExercise.textContent = t('activityExercise');
            if (activitySleep) activitySleep.textContent = t('activitySleep');
            if (activityDaily) activityDaily.textContent = t('activityDaily');

            // Navigation buttons
            const backBtnText = document.getElementById('backBtnText');
            if (backBtnText) backBtnText.textContent = t('backBtn');

            // Loading screen
            const loadingText = document.getElementById('loadingText');
            const loadingSubtext = document.getElementById('loadingSubtext');
            if (loadingText) loadingText.textContent = t('loadingText');
            if (loadingSubtext) loadingSubtext.textContent = t('loadingSubtext');

            // Follow-up section
            const followUpTitle = document.querySelector('.follow-up-title');
            const followUpInput = document.getElementById('followUpInput');
            if (followUpTitle) followUpTitle.textContent = t('followUpTitle');
            if (followUpInput) followUpInput.placeholder = t('followUpPlaceholder');

            // Update duration slider display with current language
            const durationValue = document.getElementById('durationValue');
            const durationSlider = document.getElementById('durationSlider');
            if (durationValue && durationSlider) {
                const value = parseInt(durationSlider.value) || assessmentData.durationMonths || 3;
                durationValue.textContent = value === 1 ? `1 ${t('month')}` : `${value} ${t('months')}`;
                console.log('🔄 Updated duration label for language change:', durationValue.textContent);
            }

            // Update duration option cards in Step 2
            const durationHours = document.getElementById('durationHours');
            const durationDays = document.getElementById('durationDays');
            const durationWeeks = document.getElementById('durationWeeks');
            const durationMonthsText = document.getElementById('durationMonths');
            if (durationHours) durationHours.textContent = t('durationHours');
            if (durationDays) durationDays.textContent = t('durationDays');
            if (durationWeeks) durationWeeks.textContent = t('durationWeeks');
            if (durationMonthsText) durationMonthsText.textContent = t('durationMonths');

            // Update next button text based on current step
            updateNextButton();
        }

        // ==================== LANGUAGE SYSTEM (2 Languages) ====================
        function setupLanguages() {
            console.log('🎨 setupLanguages() called');
            console.log('🌏 Current regionalLanguage value:', regionalLanguage);
            // Build 2-language buttons: EN, HI only
            const stickyLangBar = document.getElementById('stickyLangBar');
            if (!stickyLangBar) {
                console.error('❌ stickyLangBar element not found!');
                return;
            }
            console.log('✅ Found stickyLangBar element');

            // Clear existing buttons
            stickyLangBar.innerHTML = '';
            console.log('🗑️ Cleared existing language buttons');

            // Language configurations with flag emojis
            const languages = [
                { code: 'en', name: 'EN', flag: '🇬🇧', fullName: 'English' },
                { code: 'hi', name: 'हिं', flag: '🇮🇳', fullName: 'Hindi' }
            ];
            console.log('📝 Base languages added: EN, HI');

            // Add regional language if detected and different from EN/HI
            // IMPORTANT: Only add if we actually have translations for it!
            if (regionalLanguage && regionalLanguage !== 'en' && regionalLanguage !== 'hi') {
                console.log('✅ regionalLanguage is truthy and unique:', regionalLanguage);

                // Check if translations exist for this language
                const hasTranslations = typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS[regionalLanguage];
                console.log('📚 Does TRANSLATIONS have', regionalLanguage, '?', hasTranslations);

                if (!hasTranslations) {
                    console.warn('⚠️⚠️⚠️ CRITICAL: No translations loaded for', regionalLanguage);
                    console.log('   Available languages in TRANSLATIONS:', typeof TRANSLATIONS !== 'undefined' ? Object.keys(TRANSLATIONS) : 'TRANSLATIONS not loaded');
                    console.log('   The third button will appear but WON\'T work because translations don\'t exist!');
                    console.log('   Solution: Add', regionalLanguage, 'to translations.js OR configure OpenAI API key');
                }

                const regionalConfig = {
                    // Indian languages
                    'mr': { code: 'mr', name: 'मराठी', flag: '🇮🇳', fullName: 'Marathi' },
                    'ta': { code: 'ta', name: 'தமிழ்', flag: '🇮🇳', fullName: 'Tamil' },
                    'gu': { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳', fullName: 'Gujarati' },
                    'kn': { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳', fullName: 'Kannada' },
                    'te': { code: 'te', name: 'తెలుగు', flag: '🇮🇳', fullName: 'Telugu' },
                    'bn': { code: 'bn', name: 'বাংলা', flag: '🇮🇳', fullName: 'Bengali' },
                    'ml': { code: 'ml', name: 'മലയാളം', flag: '🇮🇳', fullName: 'Malayalam' },
                    'pa': { code: 'pa', name: 'ਪੰਜਾਬੀ', flag: '🇮🇳', fullName: 'Punjabi' },
                    // International languages
                    'ar': { code: 'ar', name: 'العربية', flag: '🇸🇦', fullName: 'Arabic' },
                    'es': { code: 'es', name: 'Español', flag: '🇪🇸', fullName: 'Spanish' },
                    'fr': { code: 'fr', name: 'Français', flag: '🇫🇷', fullName: 'French' },
                    'de': { code: 'de', name: 'Deutsch', flag: '🇩🇪', fullName: 'German' },
                    'pt': { code: 'pt', name: 'Português', flag: '🇵🇹', fullName: 'Portuguese' },
                    'ru': { code: 'ru', name: 'Русский', flag: '🇷🇺', fullName: 'Russian' },
                    'zh': { code: 'zh', name: '中文', flag: '🇨🇳', fullName: 'Chinese' },
                    'ja': { code: 'ja', name: '日本語', flag: '🇯🇵', fullName: 'Japanese' },
                    'ko': { code: 'ko', name: '한국어', flag: '🇰🇷', fullName: 'Korean' }
                };

                // ALWAYS add the button - translations will be generated on click if needed
                if (regionalConfig[regionalLanguage]) {
                    console.log('✅ Found regional config for:', regionalLanguage);
                    languages.push(regionalConfig[regionalLanguage]);
                    console.log('✅ Added third language button:', regionalConfig[regionalLanguage].fullName, 'with label:', regionalConfig[regionalLanguage].name);

                    if (!hasTranslations) {
                        console.warn('⚠️ Note: Translations for', regionalLanguage, 'will be generated when button is clicked');
                        console.log('   AI will generate translations if OpenAI API key is configured');
                    } else {
                        console.log('✅ Translations already available for', regionalLanguage);
                    }
                } else {
                    // No config - add generic button
                    console.warn('⚠️ No predefined config for:', regionalLanguage, '- adding generic button');
                    const langName = regionalLanguage.toUpperCase();
                    languages.push({
                        code: regionalLanguage,
                        name: langName,
                        flag: '🌏',
                        fullName: langName
                    });
                    console.log('✅ Added generic third language button:', langName);

                    if (!hasTranslations) {
                        console.warn('⚠️ Note: Translations will be generated when button is clicked');
                    }
                }
            } else {
                console.log('ℹ️ No regional language configured, showing only 2 buttons (EN, HI)');
            }

            console.log('📊 Total languages to render:', languages.length);
            console.log('🔤 Languages array:', languages);

            // Create buttons
            languages.forEach((lang, index) => {
                const btn = document.createElement('button');
                btn.className = 'sticky-lang-btn';
                btn.setAttribute('data-lang', lang.code);
                btn.setAttribute('title', lang.fullName);
                btn.onclick = async () => await switchLanguage(lang.code);

                // Add flag and name
                btn.innerHTML = `<span class="lang-flag">${lang.flag}</span> ${lang.name}`;

                // Set active state
                if (lang.code === assessmentData.currentLanguage) {
                    btn.classList.add('active');
                }

                stickyLangBar.appendChild(btn);
                console.log(`✅ Created button ${index + 1}:`, lang.fullName, '| Active:', lang.code === assessmentData.currentLanguage);
            });
            console.log('✅ setupLanguages() completed. Total buttons created:', languages.length);
        }

        async function switchLanguage(lang) {
            console.log('═══════════════════════════════════════════════════');
            console.log('🔄 switchLanguage() START - called with:', lang);
            console.log('📊 Current assessmentData.currentLanguage:', assessmentData.currentLanguage);

            // Normalize language code (e.g., ar-SA → ar, mr-IN → mr)
            const normalizedLang = normalizeLangCode(lang);
            console.log('✅ Normalized language code:', normalizedLang);

            // Update current language
            assessmentData.currentLanguage = normalizedLang;
            localStorage.setItem('preferred_language', normalizedLang);
            console.log('💾 Saved language preference to localStorage:', normalizedLang);
            console.log('💾 Updated assessmentData.currentLanguage to:', assessmentData.currentLanguage);

            // Check if translations exist for this language
            console.log('🔍 Checking if TRANSLATIONS object exists...');
            if (typeof TRANSLATIONS !== 'undefined') {
                console.log('✅ TRANSLATIONS object is loaded');
                console.log('📚 Available languages in TRANSLATIONS:', Object.keys(TRANSLATIONS));

                if (TRANSLATIONS[normalizedLang]) {
                    console.log('✅ Translations available for:', normalizedLang);
                    console.log('📊 Sample translation keys:', Object.keys(TRANSLATIONS[normalizedLang]).slice(0, 10));
                    console.log('📊 Sample translations:');
                    console.log('  - headerTitle:', TRANSLATIONS[normalizedLang].headerTitle);
                    console.log('  - step1Title:', TRANSLATIONS[normalizedLang].step1Title);
                } else {
                    console.warn('⚠️ No translations found for:', normalizedLang);

                    // Try to generate translations if not English
                    if (normalizedLang !== 'en') {
                        console.log('🧠 Attempting to generate translation for:', normalizedLang);

                        // Show loading indicator with progress
                        const headerTitle = document.getElementById('headerTitle');
                        const originalHeaderText = headerTitle ? headerTitle.textContent : '';

                        if (headerTitle) {
                            headerTitle.textContent = '🌐 Translating interface... [0% done]';
                        }

                        // Progress callback to update UI
                        const updateProgress = (progress) => {
                            if (headerTitle) {
                                headerTitle.textContent = `🌐 Translating interface... [${progress}% done]`;
                            }
                        };

                        // Auto-hide loading message after 5 seconds regardless of outcome
                        const autoHideTimer = setTimeout(() => {
                            if (headerTitle && headerTitle.textContent.includes('Translating interface')) {
                                console.log('⏰ Auto-hiding translation banner after 5 seconds');
                                // Try to get the translated title, or fall back to English
                                if (TRANSLATIONS[normalizedLang] && TRANSLATIONS[normalizedLang].headerTitle) {
                                    headerTitle.textContent = TRANSLATIONS[normalizedLang].headerTitle;
                                } else {
                                    headerTitle.textContent = 'AI-Powered Pain Assessment';
                                }
                            }
                        }, 5000);

                        console.log('🌍 Starting hybrid translation (DeepL + MyMemory)...');
                        const newTranslation = await generateDynamicTranslation(normalizedLang, updateProgress);

                        // Clear auto-hide timer since we're done
                        clearTimeout(autoHideTimer);

                        if (newTranslation) {
                            console.log('✅ Successfully generated translation for:', normalizedLang);
                            console.log('🎉 Translation is now available! Applying to UI...');

                            // Clear loading message immediately on success with fade effect
                            if (headerTitle && TRANSLATIONS[normalizedLang] && TRANSLATIONS[normalizedLang].headerTitle) {
                                headerTitle.textContent = '✅ Translation complete!';
                                // Fade to actual translated title after 500ms
                                setTimeout(() => {
                                    headerTitle.textContent = TRANSLATIONS[normalizedLang].headerTitle;
                                }, 500);
                            }

                            // NOW translations exist in TRANSLATIONS[normalizedLang]
                            // Continue to apply them below
                        } else {
                            console.warn('⚠️ Translation generation failed');
                            console.log('💡 Translation API may be temporarily unavailable');

                            // Clear loading message and show error
                            if (headerTitle) {
                                headerTitle.textContent = 'AI-Powered Pain Assessment (Translation service temporarily unavailable)';
                                setTimeout(() => {
                                    headerTitle.textContent = 'AI-Powered Pain Assessment';
                                }, 3000);
                            }

                            // Don't continue - stay in current language
                            return;
                        }
                    }
                }
            } else {
                console.error('❌ TRANSLATIONS object is NOT loaded!');
                return;
            }

            // Rebuild language buttons to update active state
            console.log('🎨 Rebuilding language buttons to update active state...');
            setupLanguages();
            console.log('✅ Language buttons rebuilt');

            // Re-apply all translations globally (explicitly pass language for fallback)
            console.log('🌍 Applying translations for:', normalizedLang);
            applyTranslations(normalizedLang);
            console.log('✅ Translations applied');

            // Update all UI text elements
            console.log('🔄 Updating UI text elements...');
            updateUIText();
            console.log('✅ UI text updated');

            // Re-render dynamic content with new language
            if (assessmentData.selectedParts && assessmentData.selectedParts.length > 0) {
                console.log('📍 Re-rendering multi-part selection UI');
                // Multi-part or single-part selection
                updateSelectedParts();
                showSelectedPartsDisplay();
                renderImpactForMultipleParts(assessmentData.selectedParts);
            } else if (assessmentData.bodyPart && CONTEXT_MATRIX[assessmentData.bodyPart]) {
                console.log('📍 Re-rendering single part UI');
                // Legacy single part
                renderDynamicSections(assessmentData.bodyPart);
                renderImpactOptions();
            }

            saveSession();

            // Speak confirmation
            speak(t('headerTitle'));

            // Auto-scroll to current section
            autoScrollToCurrentSection();

            // Visual confirmation - flash the header to show language changed
            if (headerTitle) {
                headerTitle.style.transition = 'all 0.3s ease';
                headerTitle.style.backgroundColor = 'rgba(0, 242, 255, 0.3)';
                setTimeout(() => {
                    headerTitle.style.backgroundColor = 'transparent';
                }, 300);
            }

            console.log('✅ Language switch completed to:', normalizedLang);
            console.log('🎯 FINAL CHECK - headerTitle.textContent is now:', document.getElementById('headerTitle')?.textContent);
            console.log('═══════════════════════════════════════════════════');
        }

        function updateUIText() {
            console.log('🔄 updateUIText() called');
            console.log('🌍 Current language:', assessmentData.currentLanguage);

            // Force re-translation of all visible text
            // This is called after language switch to ensure everything updates

            // Update all elements with data-i18n attribute
            const translatableElements = document.querySelectorAll('[data-i18n]');
            console.log(`📝 Found ${translatableElements.length} elements with data-i18n`);

            translatableElements.forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (key) {
                    const translation = t(key);
                    if (translation !== key) { // Only update if translation exists
                        el.textContent = translation;
                        console.log(`✅ Translated [${key}] to: ${translation.substring(0, 30)}...`);
                    }
                }
            });

            // Update navigation buttons
            const prevButtons = document.querySelectorAll('.prev-button, .btn-prev');
            const nextButtons = document.querySelectorAll('.next-button, .btn-next');
            prevButtons.forEach(btn => {
                if (btn.textContent && !btn.querySelector('svg')) {
                    btn.textContent = t('prevButton') || 'Previous';
                }
            });
            nextButtons.forEach(btn => {
                if (btn.textContent && !btn.querySelector('svg')) {
                    btn.textContent = t('nextButton') || 'Next';
                }
            });

            // Update any other dynamic UI elements
            const submitButtons = document.querySelectorAll('[type="submit"], .submit-button');
            submitButtons.forEach(btn => {
                if (btn.dataset.translateKey) {
                    btn.textContent = t(btn.dataset.translateKey);
                }
            });

            console.log('✅ UI text updated for language:', assessmentData.currentLanguage);
        }

        // ==================== AUTO-SCROLL ====================
        function autoScrollToCurrentSection() {
            const currentStep = assessmentData.currentStep;
            const stepElement = document.getElementById(`step${currentStep}`);

            if (stepElement && stepElement.style.display !== 'none') {
                setTimeout(() => {
                    stepElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }, 300);
            }
        }

        // ==================== MUTATION OBSERVER FOR DYNAMIC CONTENT ====================
        const translationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        // Translate elements with data-i18n attribute
                        const i18nElements = node.querySelectorAll?.('[data-i18n]') || [];
                        i18nElements.forEach(el => {
                            const key = el.getAttribute('data-i18n');
                            if (key && t(key)) {
                                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                                    el.placeholder = t(key);
                                } else {
                                    el.textContent = t(key);
                                }
                            }
                        });

                        // If the added node itself has data-i18n
                        if (node.hasAttribute?.('data-i18n')) {
                            const key = node.getAttribute('data-i18n');
                            if (key && t(key)) {
                                if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
                                    node.placeholder = t(key);
                                } else {
                                    node.textContent = t(key);
                                }
                            }
                        }
                    }
                });
            });
        });

        // Start observing the document for changes
        function startTranslationObserver() {
            translationObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        // ==================== AI RESPONSE TRANSLATION ====================
        async function translateAIResponse(text) {
            const currentLang = assessmentData.currentLanguage;

            // No translation needed for English
            if (currentLang === 'en') {
                return text;
            }

            // Try OpenAI translation if API key is available
            if (API_CONFIG.openai.key) {
                try {
                    const langNames = {
                        'hi': 'Hindi',
                        'mr': 'Marathi',
                        'ta': 'Tamil',
                        'gu': 'Gujarati'
                    };

                    const targetLang = langNames[currentLang] || 'Hindi';

                    const response = await fetch(API_CONFIG.openai.endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${API_CONFIG.openai.key}`
                        },
                        body: JSON.stringify({
                            model: 'gpt-4o-mini',
                            messages: [
                                {
                                    role: 'system',
                                    content: `You are a professional medical translator. Translate the following medical assessment text to ${targetLang}. Maintain medical accuracy and professional tone.`
                                },
                                {
                                    role: 'user',
                                    content: text
                                }
                            ],
                            temperature: 0.3,
                            max_tokens: 1500
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        return data.choices[0].message.content;
                    }
                } catch (error) {
                    console.error('OpenAI translation error:', error);
                }
            }

            // Fallback to MyMemory API (free, no key required)
            try {
                const langCodes = {
                    'hi': 'hi',
                    'mr': 'mr',
                    'ta': 'ta',
                    'gu': 'gu'
                };

                const targetLang = langCodes[currentLang] || 'hi';

                // Split text into chunks (MyMemory has length limits)
                const chunkSize = 500;
                const chunks = [];
                for (let i = 0; i < text.length; i += chunkSize) {
                    chunks.push(text.substring(i, i + chunkSize));
                }

                const translatedChunks = await Promise.all(
                    chunks.map(async (chunk) => {
                        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|${targetLang}`);
                        if (response.ok) {
                            const data = await response.json();
                            return data.responseData.translatedText;
                        }
                        return chunk;
                    })
                );

                return translatedChunks.join(' ');
            } catch (error) {
                console.error('MyMemory translation error:', error);
                return text; // Return original text if translation fails
            }
        }

        // ==================== IMPACT OPTIONS ====================
        function renderImpactOptions() {
            const step3 = document.getElementById('step3');
            if (!step3) return;

            // Determine which impact set to use based on body part
            const bodyPart = assessmentData.bodyPart;
            const impactSet = IMPACT_MATRIX[bodyPart] || IMPACT_MATRIX.default;

            // Find or create impact section
            let impactSection = step3.querySelector('.impact-section');
            if (!impactSection) {
                impactSection = document.createElement('div');
                impactSection.className = 'impact-section';
                // step3 IS the .step-content div, use it directly
                step3.insertBefore(impactSection, step3.firstChild);
                console.log('✅ Impact section inserted into step3');
            }

            // SVG icons for each impact level
            const svgIcons = {
                'check-circle': '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>',
                'alert-triangle': '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>',
                'alert-circle': '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>',
                'alert-octagon': '<path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2zm0-6h2v4h-2z"/>'
            };

            // Build impact cards dynamically
            const impactLevels = ['mild', 'moderate', 'severe', 'critical'];
            const cardsHTML = impactLevels.map(level => {
                const data = impactSet[level];
                return `
                    <div class="impact-card" data-impact="${level}">
                        <div class="impact-icon">
                            <svg viewBox="0 0 24 24">
                                ${svgIcons[data.icon]}
                            </svg>
                        </div>
                        <div class="impact-content">
                            <div class="impact-title">${data.title}</div>
                            <div class="impact-description">${data.description}</div>
                        </div>
                    </div>
                `;
            }).join('');

            impactSection.innerHTML = `
                <h3 class="section-title" data-i18n="impactLabel">${t('impactLabel') || 'Impact on Daily Life'}</h3>
                <div class="impact-options">
                    ${cardsHTML}
                </div>
            `;

            // Add event delegation for impact card clicks
            const impactOptions = impactSection.querySelector('.impact-options');
            if (impactOptions) {
                // Remove old listeners by cloning
                const newImpactOptions = impactOptions.cloneNode(true);
                impactOptions.parentNode.replaceChild(newImpactOptions, impactOptions);

                // Add new event listener with delegation
                newImpactOptions.addEventListener('click', (e) => {
                    const card = e.target.closest('.impact-card');
                    if (card) {
                        const level = card.getAttribute('data-impact');
                        if (level) {
                            handleImpactSelect(level);
                        }
                    }
                });
            }

            // Highlight selected impact if exists
            if (assessmentData.impactLevel) {
                const selectedCard = impactSection.querySelector(`[data-impact="${assessmentData.impactLevel}"]`);
                if (selectedCard) {
                    selectedCard.classList.add('selected');
                }
            }
        }

        function handleImpactSelect(impact) {
            assessmentData.impactLevel = impact;

            // Update UI
            document.querySelectorAll('.impact-card').forEach(card => {
                card.classList.remove('selected');
            });

            const selectedCard = document.querySelector(`[data-impact="${impact}"]`);
            if (selectedCard) {
                selectedCard.classList.add('selected');
            }

            // Refresh dependent questions based on impact level
            const bodyPart = assessmentData.bodyPart;
            if (bodyPart && CONTEXT_MATRIX[bodyPart]) {
                renderDynamicSections(bodyPart);
            }

            saveSession();
            checkNextButtonState();

            // Speak confirmation
            speak(`${t(impact)} impact selected`);

            // Auto-scroll to next section
            autoScrollToCurrentSection();
        }

        // Initialize body part accessibility and event handling
        function initializeBodyDiagram() {
            const svgs = ['maleSvg', 'femaleSvg'];

            svgs.forEach(svgId => {
                const svg = document.getElementById(svgId);
                if (!svg) return;

                // Add accessibility attributes to all body parts
                const bodyParts = svg.querySelectorAll('.body-part');
                bodyParts.forEach((part, index) => {
                    const partName = part.getAttribute('data-part');
                    if (partName) {
                        // Add tabindex for keyboard navigation
                        part.setAttribute('tabindex', '0');

                        // Add aria-label for screen readers
                        const formattedName = partName.charAt(0).toUpperCase() + partName.slice(1);
                        part.setAttribute('aria-label', `Select ${formattedName}`);
                        part.setAttribute('role', 'button');

                        // Add keyboard support
                        part.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                selectBodyPart(partName, true, e);
                            }
                        });
                    }
                });
            });
        }

        // INITIALIZATION
        document.addEventListener('DOMContentLoaded', async function() {
            console.log('🚀 DOMContentLoaded fired - Starting initialization...');
            // Wait for translations.js to fully load (increased delay for reliability)
            console.log('⏳ Waiting 1200ms for translations.js to load...');
            await new Promise(resolve => setTimeout(resolve, 1200));
            console.log('✅ 1200ms delay completed');

            // Initialize body diagram with accessibility features
            console.log('🎨 Initializing body diagram...');
            initializeBodyDiagram();

            // Initialize simplified language system (EN, HI, MR)
            console.log('🚀 Initializing language system...');
            await initializeLanguageSystem();
            console.log('✅ Language system initialized successfully');

            updateProgress();
            checkNextButtonState();
            loadSession();

            // Apply translations after loading session
            applyTranslations();

            // Initialize duration slider with proper event handling
            console.log('🎚️ Initializing duration slider...');
            const durationSlider = document.getElementById('durationSlider');
            const durationLabel = document.getElementById('durationValue');

            if (durationSlider && durationLabel) {
                console.log('✅ Duration slider found');

                // Initialize with current value or default
                const initialValue = parseInt(durationSlider.value) || 3;
                assessmentData.durationMonths = initialValue;
                durationLabel.textContent = initialValue === 1 ? `1 ${t('month')}` : `${initialValue} ${t('months')}`;
                console.log('📊 Initialized duration slider with value:', initialValue, '→', durationLabel.textContent);

                durationSlider.addEventListener('input', function(e) {
                    const value = parseInt(e.target.value);
                    console.log('🔄 Duration slider changed to:', value);

                    // Update assessmentData
                    assessmentData.durationMonths = value;
                    console.log('💾 Stored in assessmentData.durationMonths:', assessmentData.durationMonths);

                    // Update display label with current language (with fallback)
                    const monthText = value === 1 ? (t('month') || 'month') : (t('months') || 'months');
                    durationLabel.textContent = `${value} ${monthText}`;
                    console.log('✅ Updated label to:', durationLabel.textContent);

                    // Save session
                    saveSession();
                });

                console.log('✅ Duration slider event listener attached');
            } else {
                console.error('❌ Duration slider or label not found!');
            }

            // Start mutation observer for dynamic content
            startTranslationObserver();

            // Render impact options in Step 3
            renderImpactOptions();

            // Check if API keys are configured
            if (!API_CONFIG.openai.key) {
                setTimeout(() => {
                    if (confirm('OpenAI API key not configured. Would you like to configure it now for real AI analysis?')) {
                        openConfig();
                    }
                }, 2000);
            }

            setTimeout(() => {
                speak(t('headerTitle'));
            }, 1000);
        });

        // Save session before page unload
        window.addEventListener('beforeunload', function() {
            saveSession();
        });

        // AUTO-SCROLL TO RESULTS
        function scrollToResults() {
            const aiResults = document.getElementById('aiResults');
            if (aiResults && aiResults.classList.contains('active')) {
                setTimeout(() => {
                    aiResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 500);
            }
        }

        // Call this after AI analysis completes
        const originalDisplayAIChatResults = displayAIChatResults;
        displayAIChatResults = function() {
            originalDisplayAIChatResults();
            scrollToResults();
        };

        // ==================== GLOBAL EXPORTS FOR INLINE ONCLICK HANDLERS ====================
        // Make functions globally accessible for inline onclick handlers in HTML
        window.selectBodyPart = selectBodyPart;
        window.selectIntensity = selectIntensity;
        window.selectDuration = selectDuration;
        window.toggleActivity = toggleActivity;
        window.switchLanguage = switchLanguage;
        window.saveConfig = saveConfig;
        window.toggleVoice = toggleVoice;
        window.openConfig = openConfig;
        window.goToStep = goToStep;
        window.showTooltip = showTooltip;
        window.hideTooltip = hideTooltip;
        window.nextStep = nextStep;
        window.previousStep = previousStep;
        window.downloadPDF = downloadPDF;
        window.shareWithDoctor = shareWithDoctor;
        window.askFollowUp = askFollowUp;
        window.submitFeedback = submitFeedback;
        window.selectContextOption = selectContextOption;
        window.toggleActivityTrigger = toggleActivityTrigger;
        window.speakQuestion = speakQuestion;
        window.startVoiceAnswerInput = startVoiceAnswerInput;
        console.log('✅ All onclick functions exported to window scope');

        // ==================== DIAGNOSTIC TEST FUNCTION ====================
        window.testLanguageSwitch = function(langCode) {
            console.clear();
            console.log('🧪 DIAGNOSTIC TEST START');
            console.log('Testing language switch to:', langCode);
            console.log('');

            console.log('1️⃣ Checking TRANSLATIONS object...');
            if (typeof TRANSLATIONS === 'undefined') {
                console.error('❌ TRANSLATIONS is UNDEFINED!');
                return;
            }
            console.log('✅ TRANSLATIONS exists');
            console.log('   Available languages:', Object.keys(TRANSLATIONS));

            console.log('');
            console.log('2️⃣ Checking if translations exist for', langCode);
            if (!TRANSLATIONS[langCode]) {
                console.error('❌ No translations for ' + langCode);
                console.log('   Available:', Object.keys(TRANSLATIONS));
                return;
            }
            console.log('✅ Translations found for', langCode);
            console.log('   Sample keys:', Object.keys(TRANSLATIONS[langCode]).slice(0, 5));

            console.log('');
            console.log('3️⃣ Testing translation values...');
            const headerEN = TRANSLATIONS.en.headerTitle;
            const headerTarget = TRANSLATIONS[langCode].headerTitle;
            console.log('   EN headerTitle:', headerEN);
            console.log('   ' + langCode + ' headerTitle:', headerTarget);

            console.log('');
            console.log('4️⃣ Checking DOM elements...');
            const headerElement = document.getElementById('headerTitle');
            if (!headerElement) {
                console.error('❌ headerTitle element NOT FOUND in DOM!');
                return;
            }
            console.log('✅ headerTitle element found');
            console.log('   Current text:', headerElement.textContent);

            console.log('');
            console.log('5️⃣ Testing switchLanguage() function...');
            if (typeof switchLanguage !== 'function') {
                console.error('❌ switchLanguage is not a function!');
                return;
            }
            console.log('✅ switchLanguage is a function');
            console.log('   Calling switchLanguage("' + langCode + '")...');
            switchLanguage(langCode);

            console.log('');
            console.log('6️⃣ Checking result after 1 second...');
            setTimeout(function() {
                const newText = document.getElementById('headerTitle')?.textContent;
                console.log('   Header text NOW:', newText);
                if (newText === headerTarget) {
                    console.log('✅✅✅ SUCCESS! Language switched to', langCode);
                } else if (newText === headerEN) {
                    console.error('❌❌❌ FAILED! Text is still in English');
                } else {
                    console.warn('⚠️⚠️⚠️ UNEXPECTED! Text is:', newText);
                }
                console.log('🧪 DIAGNOSTIC TEST END');
            }, 1000);
        };

        // Export shortcuts for easy testing
        window.testHindi = function() { testLanguageSwitch('hi'); };
        window.testMarathi = function() { testLanguageSwitch('mr'); };

        console.log('');
        console.log('🧪 DIAGNOSTIC FUNCTIONS AVAILABLE:');
        console.log('   Type: testHindi()    - to test Hindi translation');
        console.log('   Type: testMarathi()  - to test Marathi translation');
        console.log('   Type: testLanguageSwitch("ar") - to test any language');


// Export public API
export {
    assessmentData,
    switchLanguage,
    selectBodyPart,
    updateIntensity,
    selectDuration,
    selectActivity,
    nextStep,
    previousStep,
    submitAssessment,
    openConfig,
    closeConfig,
    saveConfig,
    toggleVoice
};
