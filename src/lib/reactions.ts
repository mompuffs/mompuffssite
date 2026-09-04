export const REACTIONS = [
  { id: "like", emoji: "👍", label: "Like" },
  { id: "love", emoji: "❤️", label: "Love" },
  { id: "laugh", emoji: "😂", label: "Haha" },
  { id: "wow", emoji: "😮", label: "Wow" },
  { id: "sad", emoji: "😢", label: "Sad" },
  { id: "angry", emoji: "😡", label: "Angry" },
  { id: "fire", emoji: "🔥", label: "Fire" },
  { id: "celebrate", emoji: "🎉", label: "Celebrate" },
  { id: "think", emoji: "🤔", label: "Think" },
  { id: "clap", emoji: "👏", label: "Clap" },
] as const;

export type ReactionId = (typeof REACTIONS)[number]["id"];

export const COMPOSER_EMOJIS = [
  "😊", "😂", "😍", "😎", "🥳", "🤩", "😮", "😢",
  "😡", "🤔", "👍", "👏", "🔥", "🎉", "❤️", "💖",
  "🙏", "🤣", "😱", "🥰", "👋", "✨", "🌿", "🚀",
];

export function isReactionId(value: string): value is ReactionId {
  return REACTIONS.some((r) => r.id === value);
}

export function reactionById(id: string) {
  return REACTIONS.find((r) => r.id === id) ?? REACTIONS[0];
}
