import {
  IconWorld,
  IconDeviceMobile,
  IconCloud,
  IconDeviceDesktop,
  IconApi,
  IconDeviceGamepad2,
  IconFlask,
  IconFolder,
} from "@/components/icons/TablerIcons";

const PROJECT_TYPE_META = {
  web: { icon: IconWorld, color: "blue" },
  mobile: { icon: IconDeviceMobile, color: "purple" },
  saas: { icon: IconCloud, color: "teal" },
  desktop: { icon: IconDeviceDesktop, color: "pink" },
  api: { icon: IconApi, color: "blue" },
  game: { icon: IconDeviceGamepad2, color: "purple" },
  testing: { icon: IconFlask, color: "pink" },
};

const DEFAULT_META = { icon: IconFolder, color: "blue" };

export function getProjectTypeMeta(projectType) {
  return PROJECT_TYPE_META[projectType] || DEFAULT_META;
}
