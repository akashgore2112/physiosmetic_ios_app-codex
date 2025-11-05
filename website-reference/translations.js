// translations.js - Comprehensive multilingual dictionary for Pain Assessment
// Supports: English (default), Hindi (manual), and Regional (auto-detected)

const TRANSLATIONS = {
    ta: {
        // Tamil translations
        headerTitle: 'AI-இயக்கப்படும் வலி மதிப்பீடு',
        headerSubtitle: 'இயற்பியல் சிகிச்சை உதவி',
        step1Title: 'எங்கே வலிக்கிறது?',
        step1Description: 'பாதிக்கப்பட்ட பகுதியைத் தேர்ந்தெடுக்கவும்',
        step2Title: 'இது எவ்வளவு காலமாக உள்ளது?',
        step2Description: 'கால அளவை தேர்ந்தெடுக்கவும்',
        step3Title: 'இது உங்கள் அன்றாட வாழ்க்கையை எவ்வாறு பாதிக்கிறது?',
        step3Description: 'உங்கள் வலி பற்றி விரிவாக தகவல் அளிக்கவும்',
        nextButton: 'அடுத்தது',
        prevButton: 'முந்தைய',
        backBtn: 'மீண்டும்',
        month: 'மாதம்',
        months: 'மாதங்கள்',
        painFrequencyLabel: 'வலி அதிர்வெண்',
        painTypeLabel: 'வலி வகை',
        durationMonthsLabel: 'மாதங்களில் கால அளவு',
        activityTriggersLabel: 'செயல்பாடு தூண்டிகள்',
        additionalNotesLabel: 'கூடுதல் குறிப்புகள்',

        // Duration Options
        durationHours: 'சில மணிநேரங்கள்',
        durationDays: 'சில நாட்கள்',
        durationWeeks: 'சில வாரங்கள்',
        durationMonths: 'மாதங்கள்+'
    },
    gu: {
        // Gujarati translations
        headerTitle: 'AI-સંચાલિત પીડા મૂલ્યાંકન',
        headerSubtitle: 'ફિઝિયોથેરાપી સહાયક',
        step1Title: 'ક્યાં દુખાવો છે?',
        step1Description: 'અસરગ્રસ્ત વિસ્તાર પસંદ કરો',
        step2Title: 'આ કેટલા સમયથી છે?',
        step2Description: 'સમયગાળો પસંદ કરો',
        step3Title: 'તે તમારા રોજિંદા જીવનને કેવી રીતે અસર કરે છે?',
        step3Description: 'તમારા પીડા વિશે વિગતવાર માહિતી આપો',
        nextButton: 'આગળ',
        prevButton: 'પાછળ',
        backBtn: 'પાછા',
        month: 'મહિનો',
        months: 'મહિનાઓ',
        painFrequencyLabel: 'પીડા આવર્તન',
        painTypeLabel: 'પીડા પ્રકાર',
        durationMonthsLabel: 'મહિનામાં સમયગાળો',
        activityTriggersLabel: 'પ્રવૃત્તિ ટ્રિગર્સ',
        additionalNotesLabel: 'વધારાની નોંધો',

        // Duration Options
        durationHours: 'થોડા કલાકો',
        durationDays: 'થોડા દિવસો',
        durationWeeks: 'થોડા અઠવાડિયા',
        durationMonths: 'મહિનાઓ+'
    },
    en: {
        // Header
        headerTitle: 'AI-Powered Pain Assessment',
        headerSubtitle: 'Real-time physiotherapy insights powered by GPT-4',

        // Step 1: Body Part Selection
        step1Title: 'Where does it hurt?',
        step1Description: 'Click on your body to select the pain area and intensity',

        // Step 2: Duration Selection
        step2Title: 'How long have you had this pain?',
        step2Description: 'Select the duration that best matches your experience',

        // Step 3: Impact Assessment
        step3Title: 'How does it affect your daily life?',
        step3Description: 'Provide detailed information about your pain',

        // Pain Frequency
        painFrequencyLabel: 'Pain Frequency',
        painFrequencyPlaceholder: 'Select frequency',
        painFrequencyOccasional: 'Occasional (1-2 times/week)',
        painFrequencyFrequent: 'Frequent (3-5 times/week)',
        painFrequencyConstant: 'Constant (Daily/All day)',

        // Pain Type
        painTypeLabel: 'Pain Type',
        painTypePlaceholder: 'Select pain type',
        painTypeDull: 'Dull/Aching',
        painTypeSharp: 'Sharp/Stabbing',
        painTypeThrobbing: 'Throbbing',
        painTypeBurning: 'Burning/Tingling',

        // Impact Level
        impactLabel: 'Impact on Daily Life',
        impactPlaceholder: 'Select impact level',
        impactMild: 'Mild (Slightly annoying)',
        impactModerate: 'Moderate (Affects some activities)',
        impactSevere: 'Severe (Significantly limits daily life)',
        impactCritical: 'Critical (Unable to perform basic tasks)',

        // Duration
        durationMonthsLabel: 'Duration in Months',
        durationSliderLabel: 'Drag to adjust duration',

        // Activity Triggers
        activityTriggersLabel: 'Activity Triggers (Check all that apply)',
        triggerWalking: 'Walking',
        triggerSitting: 'Sitting',
        triggerSleeping: 'Sleeping/Lying down',
        triggerExercise: 'Exercise/Physical activity',
        triggerStanding: 'Standing',
        triggerBending: 'Bending/Lifting',

        // Additional Notes
        additionalNotesLabel: 'Additional Notes (Optional)',
        additionalNotesPlaceholder: 'Any other symptoms, medications, or relevant information...',

        // Activities Affected
        subsectionTitle: 'How does it affect you?',
        subsectionDescription: 'Select all activities that are difficult',
        activityWork: 'Work/Study',
        activityExercise: 'Exercise',
        activitySleep: 'Sleep',
        activityDaily: 'Daily Tasks',

        // Buttons
        backBtn: 'Back',
        continueBtn: 'Continue',
        analyzeBtn: 'Analyze My Pain',
        bookBtn: 'Book Consultation',
        sendBtn: 'Send',
        downloadPDF: 'Download PDF',
        shareWithDoctor: 'Share with Doctor',

        // Loading States
        loadingText: 'Analyzing Your Pain Profile...',
        loadingSubtext: 'Our AI is processing your assessment with GPT-4',

        // Follow-up Chat
        followUpTitle: 'Ask AI a Follow-up Question',
        followUpPlaceholder: 'e.g., What exercises should I do?',

        // Summary
        summaryTitle: 'Assessment Summary',
        summaryArea: 'Affected Area',
        summaryLevel: 'Pain Level',
        summaryDuration: 'Duration',
        summaryRecovery: 'Recovery Estimate',
        recoveryForecast: 'Recovery Forecast',
        analysisConfidence: 'Analysis Confidence',
        personalizedTips: 'Personalized Daily Tips',

        // Time Units
        months: 'months',
        month: 'month',
        weeks: 'weeks',
        week: 'week',
        days: 'days',
        day: 'day',

        // Duration Options
        durationHours: 'Few Hours',
        durationDays: 'Few Days',
        durationWeeks: 'Few Weeks',
        durationMonths: 'Months+',

        // Configuration
        configSaved: 'Configuration saved successfully',

        // Context Questions - Knee
        contextKneeStairs: 'Does it hurt when climbing stairs?',
        contextKneeClicking: 'Do you hear any clicking or popping sounds?',
        contextKneeSwelling: 'Is there swelling around the knee?',

        // Context Questions - Back
        contextBackRadiate: 'Does the pain radiate to your legs?',
        contextBackMorning: 'Is it worse in the morning?',
        contextBackCoughing: 'Does coughing or sneezing increase the pain?',

        // Context Questions - Shoulder
        contextShoulderRaise: 'Can you raise your arm above your head?',
        contextShoulderWeakness: 'Do you feel weakness in the shoulder?',
        contextShoulderNight: 'Is there pain at night?',

        // Context Questions - Neck
        contextNeckHeadache: 'Do you have headaches associated with neck pain?',
        contextNeckRadiate: 'Does the pain radiate to your arms?',
        contextNeckTurning: 'Is it difficult to turn your head?',

        // Context Questions - Wrist
        contextWristNumbness: 'Do you have numbness or tingling in your fingers?',
        contextWristGrip: 'Is grip strength affected?',
        contextWristTyping: 'Does typing or writing increase pain?',

        // Context Questions - Ankle
        contextAnkleInjury: 'Did you injure your ankle recently?',
        contextAnkleSwelling: 'Is there visible swelling or bruising?',
        contextAnkleWeight: 'Can you bear weight on it?',

        // Context Questions - Hip
        contextHipGroin: 'Does the pain radiate to the groin?',
        contextHipShoes: 'Is it difficult to put on shoes/socks?',
        contextHipClicking: 'Do you hear clicking sounds from the hip?',

        // Radio Options
        optionYes: 'Yes',
        optionNo: 'No',
        optionSometimes: 'Sometimes',
        optionOccasionally: 'Occasionally',
        optionWithDifficulty: 'With difficulty',
        optionSlightly: 'Slightly',
        optionAboutSame: 'About the same',
        optionMild: 'Mild',
        optionNotSure: 'Not sure',
        optionModerately: 'Moderately',

        // Voice Features
        voiceListen: '🎧 Read Question',
        voiceSpeak: '🎤 Speak Answer',
        voiceListening: 'Listening...',
        voiceSpeaking: 'Speaking...',

        // Progress Header
        progressStep: 'Step',
        progressOf: 'of',

        // Activities by Body Part
        activityWalking: 'Walking',
        activityRunning: 'Running',
        activityClimbingStairs: 'Climbing stairs',
        activitySquatting: 'Squatting',
        activityStandingLong: 'Standing for long periods',
        activitySitting: 'Sitting',
        activityStanding: 'Standing',
        activityBending: 'Bending',
        activityLiftingObjects: 'Lifting objects',
        activitySleeping: 'Sleeping',
        activityReachingOverhead: 'Reaching overhead',
        activityCarryingBags: 'Carrying bags',
        activitySleepingOnSide: 'Sleeping on that side',
        activityThrowingMotions: 'Throwing motions',
        activityLookingAtPhone: 'Looking at phone/computer',
        activityDriving: 'Driving',
        activityReading: 'Reading',
        activityTurningHead: 'Turning head',
        activityTyping: 'Typing',
        activityWriting: 'Writing',
        activityGrippingObjects: 'Gripping objects',
        activityUsingPhone: 'Using phone',
        activityLiftingItems: 'Lifting items',
        activitySportsActivities: 'Sports activities',
        activityGettingUp: 'Getting up from sitting',
        activityLyingOnSide: 'Lying on that side'
    },

    hi: {
        // Header
        headerTitle: 'AI-संचालित दर्द मूल्यांकन',
        headerSubtitle: 'GPT-4 द्वारा संचालित वास्तविक समय फिजियोथेरेपी अंतर्दृष्टि',

        // Step Titles
        step1Title: 'कहाँ दर्द होता है?',
        step1Description: 'दर्द क्षेत्र और तीव्रता चुनने के लिए अपने शरीर पर क्लिक करें',
        step2Title: 'आपको यह दर्द कब से है?',
        step2Description: 'वह अवधि चुनें जो आपके अनुभव से मेल खाती है',
        step3Title: 'यह आपके दैनिक जीवन को कैसे प्रभावित करता है?',
        step3Description: 'अपने दर्द के बारे में विस्तृत जानकारी प्रदान करें',

        // Pain Frequency
        painFrequencyLabel: 'दर्द की आवृत्ति',
        painFrequencyPlaceholder: 'आवृत्ति चुनें',
        painFrequencyOccasional: 'कभी-कभी (सप्ताह में 1-2 बार)',
        painFrequencyFrequent: 'अक्सर (सप्ताह में 3-5 बार)',
        painFrequencyConstant: 'लगातार (दैनिक/पूरे दिन)',

        // Pain Type
        painTypeLabel: 'दर्द का प्रकार',
        painTypePlaceholder: 'दर्द का प्रकार चुनें',
        painTypeDull: 'सुस्त/दर्द',
        painTypeSharp: 'तेज/चुभने वाला',
        painTypeThrobbing: 'धड़कता हुआ',
        painTypeBurning: 'जलन/झुनझुनी',

        // Impact Level
        impactLabel: 'दैनिक जीवन पर प्रभाव',
        impactPlaceholder: 'प्रभाव स्तर चुनें',
        impactMild: 'हल्का (थोड़ा परेशान करने वाला)',
        impactModerate: 'मध्यम (कुछ गतिविधियों को प्रभावित करता है)',
        impactSevere: 'गंभीर (दैनिक जीवन को काफी सीमित करता है)',
        impactCritical: 'गंभीर (बुनियादी कार्य करने में असमर्थ)',

        // Duration
        durationMonthsLabel: 'महीनों में अवधि',
        durationSliderLabel: 'अवधि समायोजित करने के लिए खींचें',

        // Activity Triggers
        activityTriggersLabel: 'गतिविधि ट्रिगर (सभी लागू चुनें)',
        triggerWalking: 'चलना',
        triggerSitting: 'बैठना',
        triggerSleeping: 'सोना/लेटना',
        triggerExercise: 'व्यायाम/शारीरिक गतिविधि',
        triggerStanding: 'खड़े रहना',
        triggerBending: 'झुकना/उठाना',

        // Additional Notes
        additionalNotesLabel: 'अतिरिक्त नोट्स (वैकल्पिक)',
        additionalNotesPlaceholder: 'कोई अन्य लक्षण, दवाएं, या प्रासंगिक जानकारी...',

        // Activities Affected
        subsectionTitle: 'यह आपको कैसे प्रभावित करता है?',
        subsectionDescription: 'सभी कठिन गतिविधियों का चयन करें',
        activityWork: 'काम/अध्ययन',
        activityExercise: 'व्यायाम',
        activitySleep: 'नींद',
        activityDaily: 'दैनिक कार्य',

        // Buttons
        backBtn: 'पीछे',
        continueBtn: 'जारी रखें',
        analyzeBtn: 'मेरे दर्द का विश्लेषण करें',
        bookBtn: 'परामर्श बुक करें',
        sendBtn: 'भेजें',
        downloadPDF: 'PDF डाउनलोड करें',
        shareWithDoctor: 'डॉक्टर के साथ साझा करें',

        // Loading States
        loadingText: 'आपके दर्द प्रोफाइल का विश्लेषण...',
        loadingSubtext: 'हमारा AI GPT-4 के साथ आपके मूल्यांकन को संसाधित कर रहा है',

        // Follow-up Chat
        followUpTitle: 'AI से एक फॉलो-अप प्रश्न पूछें',
        followUpPlaceholder: 'उदा., मुझे कौन से व्यायाम करने चाहिए?',

        // Summary
        summaryTitle: 'मूल्यांकन सारांश',
        summaryArea: 'प्रभावित क्षेत्र',
        summaryLevel: 'दर्द स्तर',
        summaryDuration: 'अवधि',
        summaryRecovery: 'रिकवरी अनुमान',
        recoveryForecast: 'रिकवरी पूर्वानुमान',
        analysisConfidence: 'विश्लेषण विश्वास',
        personalizedTips: 'व्यक्तिगत दैनिक सुझाव',

        // Time Units
        months: 'महीने',
        month: 'महीना',
        weeks: 'सप्ताह',
        week: 'सप्ताह',
        days: 'दिन',
        day: 'दिन',

        // Duration Options
        durationHours: 'कुछ घंटे',
        durationDays: 'कुछ दिन',
        durationWeeks: 'कुछ सप्ताह',
        durationMonths: 'महीने+',

        // Configuration
        configSaved: 'कॉन्फ़िगरेशन सफलतापूर्वक सहेजा गया',

        // Context Questions - Knee
        contextKneeStairs: 'क्या सीढ़ियाँ चढ़ते समय दर्द होता है?',
        contextKneeClicking: 'क्या आप कोई चटकने या फटने की आवाज़ सुनते हैं?',
        contextKneeSwelling: 'क्या घुटने के आसपास सूजन है?',

        // Context Questions - Back
        contextBackRadiate: 'क्या दर्द आपके पैरों तक फैलता है?',
        contextBackMorning: 'क्या यह सुबह के समय बदतर होता है?',
        contextBackCoughing: 'क्या खांसने या छींकने से दर्द बढ़ता है?',

        // Context Questions - Shoulder
        contextShoulderRaise: 'क्या आप अपनी बांह को अपने सिर के ऊपर उठा सकते हैं?',
        contextShoulderWeakness: 'क्या आप कंधे में कमजोरी महसूस करते हैं?',
        contextShoulderNight: 'क्या रात में दर्द होता है?',

        // Context Questions - Neck
        contextNeckHeadache: 'क्या गर्दन के दर्द के साथ सिरदर्द होता है?',
        contextNeckRadiate: 'क्या दर्द आपकी बाहों तक फैलता है?',
        contextNeckTurning: 'क्या अपना सिर घुमाना मुश्किल है?',

        // Context Questions - Wrist
        contextWristNumbness: 'क्या आपकी उंगलियों में सुन्नता या झुनझुनी है?',
        contextWristGrip: 'क्या पकड़ की ताकत प्रभावित है?',
        contextWristTyping: 'क्या टाइपिंग या लिखने से दर्द बढ़ता है?',

        // Context Questions - Ankle
        contextAnkleInjury: 'क्या हाल ही में आपके टखने में चोट लगी थी?',
        contextAnkleSwelling: 'क्या दिखाई देने वाली सूजन या चोट के निशान हैं?',
        contextAnkleWeight: 'क्या आप इस पर वजन सहन कर सकते हैं?',

        // Context Questions - Hip
        contextHipGroin: 'क्या दर्द कमर तक फैलता है?',
        contextHipShoes: 'क्या जूते/मोज़े पहनना मुश्किल है?',
        contextHipClicking: 'क्या आप कूल्हे से चटकने की आवाज़ सुनते हैं?',

        // Radio Options
        optionYes: 'हाँ',
        optionNo: 'नहीं',
        optionSometimes: 'कभी-कभी',
        optionOccasionally: 'कभी-कभार',
        optionWithDifficulty: 'कठिनाई के साथ',
        optionSlightly: 'थोड़ा',
        optionAboutSame: 'लगभग समान',
        optionMild: 'हल्का',
        optionNotSure: 'निश्चित नहीं',
        optionModerately: 'मध्यम रूप से',

        // Voice Features
        voiceListen: '🎧 प्रश्न सुनें',
        voiceSpeak: '🎤 उत्तर बोलें',
        voiceListening: 'सुन रहे हैं...',
        voiceSpeaking: 'बोल रहे हैं...',

        // Progress Header
        progressStep: 'चरण',
        progressOf: 'का',

        // Activities
        activityWalking: 'चलना',
        activityRunning: 'दौड़ना',
        activityClimbingStairs: 'सीढ़ियाँ चढ़ना',
        activitySquatting: 'बैठना',
        activityStandingLong: 'लंबे समय तक खड़े रहना',
        activitySitting: 'बैठना',
        activityStanding: 'खड़े रहना',
        activityBending: 'झुकना',
        activityLiftingObjects: 'वस्तुओं को उठाना',
        activitySleeping: 'सोना',
        activityReachingOverhead: 'ऊपर पहुंचना',
        activityCarryingBags: 'बैग ले जाना',
        activitySleepingOnSide: 'उस तरफ सोना',
        activityThrowingMotions: 'फेंकने की गतिविधियाँ',
        activityLookingAtPhone: 'फोन/कंप्यूटर देखना',
        activityDriving: 'गाड़ी चलाना',
        activityReading: 'पढ़ना',
        activityTurningHead: 'सिर घुमाना',
        activityTyping: 'टाइप करना',
        activityWriting: 'लिखना',
        activityGrippingObjects: 'वस्तुओं को पकड़ना',
        activityUsingPhone: 'फोन का उपयोग करना',
        activityLiftingItems: 'वस्तुओं को उठाना',
        activitySportsActivities: 'खेल गतिविधियाँ',
        activityGettingUp: 'बैठने से उठना',
        activityLyingOnSide: 'उस तरफ लेटना'
    },

    mr: {
        // Header - Marathi
        headerTitle: 'AI-सक्षम वेदना मूल्यमापन',
        headerSubtitle: 'GPT-4 द्वारे संचालित रिअल-टाइम फिजिओथेरपी अंतर्दृष्टी',

        // Step Titles
        step1Title: 'कुठे दुखते?',
        step1Description: 'वेदना क्षेत्र आणि तीव्रता निवडण्यासाठी आपल्या शरीरावर क्लिक करा',
        step2Title: 'ही वेदना किती काळापासून आहे?',
        step2Description: 'आपल्या अनुभवाशी जुळणारा कालावधी निवडा',
        step3Title: 'हे आपल्या दैनंदिन जीवनावर कसा परिणाम करते?',
        step3Description: 'आपल्या वेदनेची तपशीलवार माहिती द्या',

        // Pain Frequency
        painFrequencyLabel: 'वेदना वारंवारता',
        painFrequencyPlaceholder: 'वारंवारता निवडा',
        painFrequencyOccasional: 'अधूनमधून (आठवड्यातून 1-2 वेळा)',
        painFrequencyFrequent: 'वारंवार (आठवड्यातून 3-5 वेळा)',
        painFrequencyConstant: 'सतत (दररोज/दिवसभर)',

        // Pain Type
        painTypeLabel: 'वेदनाचा प्रकार',
        painTypePlaceholder: 'वेदनाचा प्रकार निवडा',
        painTypeDull: 'मंद/दुखणे',
        painTypeSharp: 'तीक्ष्ण/टोचणारा',
        painTypeThrobbing: 'धडधडणारा',
        painTypeBurning: 'जळजळ/मुंग्या येणे',

        // Impact Level
        impactLabel: 'दैनंदिन जीवनावर परिणाम',
        impactPlaceholder: 'परिणाम पातळी निवडा',
        impactMild: 'सौम्य (थोडासा त्रासदायक)',
        impactModerate: 'मध्यम (काही क्रियाकलाप प्रभावित)',
        impactSevere: 'गंभीर (दैनंदिन जीवन लक्षणीयरीत्या मर्यादित)',
        impactCritical: 'अत्यंत गंभीर (मूलभूत कार्ये करण्यास असमर्थ)',

        // Duration
        durationMonthsLabel: 'महिन्यांमध्ये कालावधी',
        durationSliderLabel: 'कालावधी समायोजित करण्यासाठी ओढा',

        // Activity Triggers
        activityTriggersLabel: 'क्रियाकलाप ट्रिगर (सर्व लागू निवडा)',
        triggerWalking: 'चालणे',
        triggerSitting: 'बसणे',
        triggerSleeping: 'झोपणे/झोपलेले',
        triggerExercise: 'व्यायाम/शारीरिक क्रियाकलाप',
        triggerStanding: 'उभे राहणे',
        triggerBending: 'वाकणे/उचलणे',

        // Additional Notes
        additionalNotesLabel: 'अतिरिक्त नोट्स (पर्यायी)',
        additionalNotesPlaceholder: 'इतर कोणतीही लक्षणे, औषधे किंवा संबंधित माहिती...',

        // Activities Affected
        subsectionTitle: 'हे तुम्हाला कसे प्रभावित करते?',
        subsectionDescription: 'सर्व कठीण क्रियाकलाप निवडा',
        activityWork: 'काम/अभ्यास',
        activityExercise: 'व्यायाम',
        activitySleep: 'झोप',
        activityDaily: 'दैनंदिन कार्ये',

        // Buttons
        backBtn: 'मागे',
        continueBtn: 'पुढे चला',
        analyzeBtn: 'माझ्या वेदनाचे विश्लेषण करा',
        bookBtn: 'सल्लामसलत बुक करा',
        sendBtn: 'पाठवा',
        downloadPDF: 'PDF डाउनलोड करा',
        shareWithDoctor: 'डॉक्टरांसोबत शेअर करा',

        // Loading States
        loadingText: 'तुमच्या वेदना प्रोफाइलचे विश्लेषण...',
        loadingSubtext: 'आमचा AI GPT-4 सह तुमच्या मूल्यांकनावर प्रक्रिया करत आहे',

        // Follow-up Chat
        followUpTitle: 'AI ला फॉलो-अप प्रश्न विचारा',
        followUpPlaceholder: 'उदा., मी कोणते व्यायाम करावेत?',

        // Summary
        summaryTitle: 'मूल्यांकन सारांश',
        summaryArea: 'प्रभावित क्षेत्र',
        summaryLevel: 'वेदना पातळी',
        summaryDuration: 'कालावधी',
        summaryRecovery: 'पुनर्प्राप्ती अंदाज',
        recoveryForecast: 'पुनर्प्राप्ती अंदाज',
        analysisConfidence: 'विश्लेषण आत्मविश्वास',
        personalizedTips: 'वैयक्तिक दैनंदिन टिपा',

        // Time Units
        months: 'महिने',
        month: 'महिना',
        weeks: 'आठवडे',
        week: 'आठवडा',
        days: 'दिवस',
        day: 'दिवस',

        // Duration Options
        durationHours: 'काही तास',
        durationDays: 'काही दिवस',
        durationWeeks: 'काही आठवडे',
        durationMonths: 'महिने+',

        // Configuration
        configSaved: 'कॉन्फिगरेशन यशस्वीरित्या जतन केले',

        // Context Questions - Knee
        contextKneeStairs: 'पायऱ्या चढताना दुखते का?',
        contextKneeClicking: 'तुम्हाला कोणताही क्लिक किंवा पॉपिंग आवाज ऐकू येतो का?',
        contextKneeSwelling: 'गुडघ्याभोवती सूज आहे का?',

        // Context Questions - Back
        contextBackRadiate: 'वेदना तुमच्या पायांपर्यंत पसरते का?',
        contextBackMorning: 'सकाळी वाईट होते का?',
        contextBackCoughing: 'खोकताना किंवा शिंकताना वेदना वाढते का?',

        // Context Questions - Shoulder
        contextShoulderRaise: 'तुम्ही तुमचा हात तुमच्या डोक्याच्या वर उचलू शकता का?',
        contextShoulderWeakness: 'तुम्हाला खांद्यात कमकुवतपणा जाणवतो का?',
        contextShoulderNight: 'रात्री वेदना होते का?',

        // Context Questions - Neck
        contextNeckHeadache: 'मानेच्या वेदनेसह डोकेदुखी होते का?',
        contextNeckRadiate: 'वेदना तुमच्या हातांपर्यंत पसरते का?',
        contextNeckTurning: 'तुमचे डोके फिरवणे कठीण आहे का?',

        // Context Questions - Wrist
        contextWristNumbness: 'तुमच्या बोटांमध्ये सुन्नपणा किंवा मुंग्या येणे आहे का?',
        contextWristGrip: 'पकड शक्ती प्रभावित आहे का?',
        contextWristTyping: 'टाइपिंग किंवा लेखन वेदना वाढवते का?',

        // Context Questions - Ankle
        contextAnkleInjury: 'तुम्हाला अलीकडेच तुमच्या घोट्याला दुखापत झाली होती का?',
        contextAnkleSwelling: 'दिसणारी सूज किंवा जखमा आहेत का?',
        contextAnkleWeight: 'तुम्ही त्यावर वजन सहन करू शकता का?',

        // Context Questions - Hip
        contextHipGroin: 'वेदना मांडीच्या सांध्यापर्यंत पसरते का?',
        contextHipShoes: 'बूट/मोजे घालणे कठीण आहे का?',
        contextHipClicking: 'तुम्हाला नितंबातून क्लिक करणारे आवाज ऐकू येतात का?',

        // Radio Options
        optionYes: 'होय',
        optionNo: 'नाही',
        optionSometimes: 'कधीकधी',
        optionOccasionally: 'अधूनमधून',
        optionWithDifficulty: 'अडचणीने',
        optionSlightly: 'थोडेसे',
        optionAboutSame: 'जवळजवळ समान',
        optionMild: 'हलकी',
        optionNotSure: 'खात्री नाही',
        optionModerately: 'मध्यम',

        // Voice Features
        voiceListen: '🎧 प्रश्न ऐका',
        voiceSpeak: '🎤 उत्तर बोला',
        voiceListening: 'ऐकत आहे...',
        voiceSpeaking: 'बोलत आहे...',

        // Progress Header
        progressStep: 'पायरी',
        progressOf: 'चा',

        // Activities
        activityWalking: 'चालणे',
        activityRunning: 'धावणे',
        activityClimbingStairs: 'पायऱ्या चढणे',
        activitySquatting: 'बसणे',
        activityStandingLong: 'दीर्घकाळ उभे राहणे',
        activitySitting: 'बसणे',
        activityStanding: 'उभे राहणे',
        activityBending: 'वाकणे',
        activityLiftingObjects: 'वस्तू उचलणे',
        activitySleeping: 'झोपणे',
        activityReachingOverhead: 'वरपर्यंत पोहोचणे',
        activityCarryingBags: 'पिशव्या घेऊन जाणे',
        activitySleepingOnSide: 'त्या बाजूला झोपणे',
        activityThrowingMotions: 'फेकण्याच्या हालचाली',
        activityLookingAtPhone: 'फोन/संगणक पाहणे',
        activityDriving: 'गाडी चालवणे',
        activityReading: 'वाचन',
        activityTurningHead: 'डोके फिरवणे',
        activityTyping: 'टाइपिंग',
        activityWriting: 'लेखन',
        activityGrippingObjects: 'वस्तू पकडणे',
        activityUsingPhone: 'फोन वापरणे',
        activityLiftingItems: 'वस्तू उचलणे',
        activitySportsActivities: 'क्रीडा क्रियाकलाप',
        activityGettingUp: 'बसण्यातून उठणे',
        activityLyingOnSide: 'त्या बाजूला झोपणे'
    }
};

// Export for use in HTML file
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TRANSLATIONS;
}
