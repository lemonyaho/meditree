const noteData = {
  lectureTitle: 'Embryology',
  date: '26.06.28',
  subtitle: 'Interactive Tree Study Note',
  tree: [
    {
      id: 'disease-01',
      title: 'Disease 01',
      children: []
    },
    {
      id: 'disease-02',
      title: 'Disease 02',
      children: []
    },
    {
      id: 'disease-03',
      title: 'Disease 03',
      children: [
        {
          id: 'definition',
          title: 'Definition',
          content: '질환의 핵심 정의를 한두 문장으로 정리합니다.',
          children: []
        },
        {
          id: 'etiology',
          title: 'Etiology',
          content: '위험인자, 원인, 관련 유전자 또는 환경 요인을 정리합니다.',
          children: []
        },
        {
          id: 'pathophysiology',
          title: 'Pathophysiology',
          children: [
            {
              id: 'trigger',
              title: 'Trigger',
              content: '질환을 시작시키는 핵심 병태생리적 사건을 적습니다.',
              children: []
            },
            {
              id: 'progression',
              title: 'Progression',
              content: '질환이 진행되는 순서를 단계적으로 적습니다.',
              children: []
            }
          ]
        },
        {
          id: 'diagnosis',
          title: 'Diagnosis',
          children: [
            {
              id: 'symptoms',
              title: 'Symptoms',
              content: '대표 증상과 비특이 증상을 구분해서 정리합니다.',
              children: []
            },
            {
              id: 'tests',
              title: 'Tests',
              content: '검사명, 검사 소견, 진단 기준을 정리합니다.',
              referenceIds: [2],
              children: []
            }
          ]
        },
        {
          id: 'staging',
          title: 'Staging',
          referenceIds: [1],
          children: [
            {
              id: 'stage-i',
              title: 'Stage I',
              children: [
                {
                  id: 'stage-ia',
                  title: 'Stage IA',
                  content: 'Stage IA의 기준을 적습니다.',
                  children: []
                },
                {
                  id: 'stage-ib',
                  title: 'Stage IB',
                  content: 'Stage IB의 기준을 적습니다.',
                  children: []
                }
              ]
            },
            {
              id: 'stage-ii',
              title: 'Stage II',
              content: 'Stage II의 기준을 적습니다.',
              children: []
            },
            {
              id: 'stage-iii',
              title: 'Stage III',
              content: 'Stage III의 기준을 적습니다.',
              children: []
            },
            {
              id: 'stage-iv',
              title: 'Stage IV',
              content: 'Stage IV의 기준을 적습니다.',
              children: []
            }
          ]
        },
        {
          id: 'treatment',
          title: 'Treatment',
          children: [
            {
              id: 'medical-treatment',
              title: 'Medication',
              content: '약물 치료 적응증, 1차 약제, 금기, 부작용을 정리합니다.',
              children: []
            },
            {
              id: 'surgical-treatment',
              title: 'Surgery',
              content: '수술 적응증, 수술 범위, fertility-sparing 여부를 정리합니다.',
              referenceIds: [3],
              children: []
            }
          ]
        },
        {
          id: 'prognosis',
          title: 'Prognosis',
          content: '예후 인자와 추적 관찰 계획을 정리합니다.',
          children: []
        }
      ]
    },
    {
      id: 'disease-04',
      title: 'Disease 04',
      children: []
    }
  ],
  references: [
    {
      id: 1,
      text: 'Kim et al. (2024), Cancers, pp.204-208.'
    },
    {
      id: 2,
      text: 'Lee et al. (2023), Obstetrics & Gynecology, pp.120-130.'
    },
    {
      id: 3,
      text: 'FIGO Committee Report (2023).'
    }
  ]
};

export default noteData;
