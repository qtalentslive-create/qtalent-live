export const TALENT_ACT_OPTIONS = [
  { value: "dj", label: "DJ" },
  { value: "band", label: "Band" },
  { value: "singer", label: "Singer" },
  { value: "saxophonist", label: "Saxophonist" },
  { value: "keyboardist", label: "Keyboardist" },
  { value: "sound_engineer", label: "Sound Engineer" },
  { value: "pianist", label: "Pianist" },
  { value: "guitarist", label: "Guitarist" },
  { value: "violinist", label: "Violinist" },
  { value: "drummer", label: "Drummer" },
  { value: "percussionist", label: "Percussionist" },
  { value: "magician", label: "Magician" },
  { value: "gogo_dancer", label: "Gogo Dancer" },
  { value: "belly_dancer", label: "Belly Dancer" },
  { value: "other", label: "Other" },
] as const;

export type TalentActValue = (typeof TALENT_ACT_OPTIONS)[number]["value"];

