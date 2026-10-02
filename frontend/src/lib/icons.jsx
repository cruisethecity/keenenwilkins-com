/**
 * Icon registry.
 *
 * resumeData.json stores icon names as strings. They resolve through the
 * hardcoded map below rather than a dynamic lookup across the whole lucide
 * package, which keeps tree shaking honest: the bundle carries the
 * thirteen icons this page actually uses instead of the fifteen hundred the
 * library ships.
 *
 * Only components are exported. The map and the lookup stay module private so
 * every consumer goes through <Glyph name="Cloud" />, which keeps the resolve
 * step in one place and keeps this file's exports uniform.
 *
 * Lucide removed its brand marks in version 1, so GitHub and LinkedIn are two
 * small local components. Both take the same size prop as a lucide icon, so
 * call sites never have to know the difference.
 */

import {
  Activity,
  Award,
  Cloud,
  Cpu,
  Database,
  FileCode,
  GraduationCap,
  KeyRound,
  Mail,
  Radar,
  Server,
  ShieldCheck,
  Terminal,
} from "lucide-react";

export function GithubMark({ size = 18, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      <path d="M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.55v-1.94c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.29 1.19-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.18-1.49 3.14-1.18 3.14-1.18.63 1.59.24 2.76.12 3.05.74.81 1.19 1.84 1.19 3.1 0 4.41-2.7 5.38-5.26 5.67.41.36.78 1.07.78 2.16v3.2c0 .31.2.66.79.55A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  );
}

export function LinkedinMark({ size = 18, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

const REGISTRY = {
  Activity,
  Award,
  Cloud,
  Cpu,
  Database,
  FileCode,
  Github: GithubMark,
  GraduationCap,
  KeyRound,
  Linkedin: LinkedinMark,
  Mail,
  Radar,
  Server,
  ShieldCheck,
  Terminal,
};

/**
 * Renders one registered icon by name.
 *
 * Resolving the component inside a dedicated wrapper rather than at each call
 * site keeps the lookup in one place, and keeps the React Compiler lint rules
 * happy: the map returns a stable module level component, so identity never
 * changes between renders and nothing remounts.
 */
export function Glyph({ name, size = 18, className, ...rest }) {
  const Component = REGISTRY[name] ?? Cloud;

  return <Component size={size} className={className} {...rest} />;
}
