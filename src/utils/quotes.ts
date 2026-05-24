export interface Quote {
  text: string;
  author: string;
}

export const COMMITTING_QUOTES: Quote[] = [
  { text: "专注是将心灵的焦距调整至无限清晰。", author: "莫兰迪的时间笔记" },
  { text: "不必步伐飞快，只要每一步都走得踏实且坚定。", author: "北欧专注美学" },
  { text: "在呼吸与专注之间，你会听见自己内在最安静的力量。", author: "极简生活宣言" },
  { text: "把每一次的番茄钟，都当作是送给自己的一段安静时光。", author: "生活漫步" },
  { text: "专注工作，舒缓呼吸；适度休息，是走得更远的秘密。", author: "瑞典工作哲学 Lagom" },
  { text: "多喝一杯水，深深吸一口气，感受当下的这一秒钟。", author: "每日正念小叮咛" },
  { text: "理清思绪，先做好眼前的这一件小事，世界就会慢下来。", author: "极简极美" },
  { text: "专注是给予手头任务最好的敬意，也是给予时间最温柔的拥抱。", author: "平静之书" },
  { text: "今日的耕耘，是明日繁花盛开的伏笔。", author: "北欧春日絮语" }
];

export function getRandomQuote(): Quote {
  const index = Math.floor(Math.random() * COMMITTING_QUOTES.length);
  return COMMITTING_QUOTES[index];
}
