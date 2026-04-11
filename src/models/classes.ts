export type ClassType = {
    name: string,
    label: string
    type : 'support' | "dealer" | "tank"
}


export const CLASSES: ClassType[] = [
    // 힐러 계열
    {
      name: "healer",
      label: "힐러",
      type: "support",
    },
    {
      name: "priest",
      label: "사제",
      type: "support",
    },
    {
      name: "monk",
      label: "수도사",
      type: "support",
    },
  
    // 전사 계열
    {
      name: "warrior",
      label: "전사",
      type: "tank",
    },
    {
      name: "greatswordWarrior",
      label: "대검전사",
      type: "dealer",
    },
    {
      name: "swordsman",
      label: "검술사",
      type: "dealer",
    },
  
    // 마법사 계열
    {
      name: "mage",
      label: "마법사",
      type: "dealer",
    },
    {
      name: "pyromancer",
      label: "화염술사",
      type: "dealer",
    },
    {
      name: "cryomancer",
      label: "빙결술사",
      type: "tank",
    },
  
    // 궁수 계열
    {
      name: "archer",
      label: "궁수",
      type: "dealer",
    },
    {
      name: "crossbowman",
      label: "석궁사수",
      type: "dealer",
    },
    {
      name: "longbowman",
      label: "장궁병",
      type: "dealer",
    },
  
    // 음유시인 계열
    {
      name: "bard",
      label: "음유시인",
      type: "support",
    },
    {
      name: "dancer",
      label: "댄서",
      type: "dealer",
    },
    {
      name: "musician",
      label: "악사",
      type: "dealer",
    },

    // 격투가 계열
    {
      name: "fighter",
      label: "격투가",
      type: "dealer",
    },

    // 암흑/전격 계열
    {
      name: "darkMage",
      label: "암흑술사",
      type: "dealer",
    },
    {
      name: "lightningMage",
      label: "전격술사",
      type: "dealer",
    },

    // 도적 계열
    {
      name: "rogue",
      label: "도적",
      type: "dealer",
    },
    {
      name: "dualBlade",
      label: "듀얼블레이드",
      type: "dealer",
    },
  ];