// 데이터 로딩 및 관리
const DataManager = (() => {
    const DATA_PATH = '/data/';
    const LEVELS = {
        9: '9급',
        8: '8급',
        7: '7급',
        6: '6급',
        5: '5급',
        4: '4급'
    };

    let loadedData = {};

    const loadData = async (level) => {
        if (loadedData[level]) {
            return loadedData[level];
        }

        try {
            const response = await fetch(`${DATA_PATH}${level}급.json`);
            if (!response.ok) throw new Error(`Failed to load level ${level}`);
            
            const data = await response.json();
            console.log(`✓ Level ${level} 데이터 로드 완료:`, data);
            loadedData[level] = data;
            return data;
        } catch (error) {
            console.error(`✗ Level ${level} 로드 실패:`, error);
            // 오류 시 기본 데이터 반환
            return getDefaultData(level);
        }
    };

    const loadAllData = async () => {
        console.log('⏳ 모든 데이터 로딩 시작...');
        const promises = Object.keys(LEVELS).map(level => {
            const levelNum = parseInt(level);
            console.log(`📥 Level ${levelNum} 로딩 중...`);
            return loadData(levelNum);
        });
        const results = await Promise.all(promises);
        console.log('✓ 모든 데이터 로딩 완료!', loadedData);
        return loadedData;
    };

    const getDefaultData = (level) => {
        return {
            level: `${level}급`,
            master_kanji_count: 100,
            categories: [
                {
                    category_name: '기본',
                    kanji_count: 5,
                    kanji_list: [
                        { kanji: '人', meaning: '사람 인' },
                        { kanji: '日', meaning: '날 일' },
                        { kanji: '火', meaning: '불 화' },
                        { kanji: '水', meaning: '물 수' },
                        { kanji: '木', meaning: '나무 목' }
                    ]
                }
            ],
            quests: []
        };
    };

    return {
        loadData,
        loadAllData,
        getLevels: () => LEVELS,
        getLoadedData: () => loadedData,
        getLevelData: (level) => loadedData[level] || null
    };
})();

// 학습 상태 관리 (로컬스토리지)
const LearningState = (() => {
    const STORAGE_KEY = 'hanja_learning_state';

    const getState = () => {
        const state = localStorage.getItem(STORAGE_KEY);
        return state ? JSON.parse(state) : {
            currentLevel: 9,
            learnedKanji: {},
            completedQuests: {},
            inventory: {},
            completedHanjaWords: {}
        };
    };

    const setState = (state) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    };

    const addLearnedKanji = (level, kanji) => {
        const state = getState();
        if (!state.learnedKanji[level]) {
            state.learnedKanji[level] = [];
        }
        if (!state.learnedKanji[level].includes(kanji)) {
            state.learnedKanji[level].push(kanji);
        }
        setState(state);
        return state;
    };

    const isKanjiLearned = (level, kanji) => {
        const state = getState();
        return state.learnedKanji[level] && state.learnedKanji[level].includes(kanji);
    };

    const getLearnedKanjiForLevel = (level) => {
        const state = getState();
        return state.learnedKanji[level] || [];
    };

    const addToInventory = (kanji, meaning) => {
        const state = getState();
        if (!state.inventory[kanji]) {
            state.inventory[kanji] = { meaning, count: 0 };
        }
        state.inventory[kanji].count += 1;
        setState(state);
        return state;
    };

    const getInventory = () => {
        const state = getState();
        return state.inventory;
    };

    const removeFromInventory = (kanji) => {
        const state = getState();
        if (state.inventory[kanji]) {
            state.inventory[kanji].count -= 1;
            if (state.inventory[kanji].count <= 0) {
                delete state.inventory[kanji];
            }
        }
        setState(state);
        return state;
    };

    const addCreatedHanjaWord = (level, questId, hanjaWord, hangul) => {
        const state = getState();
        if (!state.completedHanjaWords[level]) {
            state.completedHanjaWords[level] = [];
        }
        state.completedHanjaWords[level].push({
            questId,
            hanjaWord,
            hangul,
            createdAt: new Date().toISOString()
        });
        setState(state);
        return state;
    };

    const getCreatedHanjaWords = (level) => {
        const state = getState();
        return state.completedHanjaWords[level] || [];
    };

    const addCompletedQuest = (level, questId) => {
        const state = getState();
        if (!state.completedQuests[level]) {
            state.completedQuests[level] = [];
        }
        if (!state.completedQuests[level].includes(questId)) {
            state.completedQuests[level].push(questId);
        }
        setState(state);
        return state;
    };

    const setCurrentLevel = (level) => {
        const state = getState();
        state.currentLevel = level;
        setState(state);
        return state;
    };

    const setCurrentBatch = (level, batchIndex) => {
        const state = getState();
        if (!state.currentBatch) {
            state.currentBatch = {};
        }
        state.currentBatch[level] = batchIndex;
        setState(state);
    };

    const getCurrentBatch = (level) => {
        const state = getState();
        return (state.currentBatch && state.currentBatch[level]) || 0;
    };

    const getBatchKanji = (allKanji, batchIndex, batchSize = 50) => {
        const start = batchIndex * batchSize;
        const end = start + batchSize;
        return allKanji.slice(start, end);
    };

    return {
        getState,
        setState,
        addLearnedKanji,
        isKanjiLearned,
        getLearnedKanjiForLevel,
        addToInventory,
        getInventory,
        removeFromInventory,
        addCreatedHanjaWord,
        getCreatedHanjaWords,
        addCompletedQuest,
        setCurrentLevel,
        setCurrentBatch,
        getCurrentBatch,
        getBatchKanji
    };
})();
