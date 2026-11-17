import type { SVGProps } from "react";

// Sourced from MIT open-source Hugeicons family via https://21st.dev/community/icons/hugeicons
type IconProps = SVGProps<SVGSVGElement>;

export function SidebarDashboardIcon({ className = "h-[16px] w-[16px]", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}>
      <path d="M13.69 19.457c-.19-.46-.19-1.042-.19-2.207s0-1.747.19-2.207a2.5 2.5 0 0 1 1.353-1.353c.46-.19 1.042-.19 2.207-.19s1.747 0 2.207.19a2.5 2.5 0 0 1 1.353 1.353c.19.46.19 1.042.19 2.207s0 1.747-.19 2.207a2.5 2.5 0 0 1-1.353 1.353c-.46.19-1.042.19-2.207.19s-1.747 0-2.207-.19a2.5 2.5 0 0 1-1.353-1.353Zm0-10.5c-.19-.46-.19-1.042-.19-2.207s0-1.747.19-2.207a2.5 2.5 0 0 1 1.353-1.353C15.503 3 16.085 3 17.25 3s1.747 0 2.207.19a2.5 2.5 0 0 1 1.353 1.353c.19.46.19 1.042.19 2.207s0 1.747-.19 2.207a2.5 2.5 0 0 1-1.353 1.353c-.46.19-1.042.19-2.207.19s-1.747 0-2.207-.19a2.5 2.5 0 0 1-1.353-1.353Zm-10.5 10.5C3 18.997 3 18.415 3 17.25s0-1.747.19-2.207a2.5 2.5 0 0 1 1.353-1.353c.46-.19 1.042-.19 2.207-.19s1.747 0 2.207.19a2.5 2.5 0 0 1 1.353 1.353c.19.46.19 1.042.19 2.207s0 1.747-.19 2.207a2.5 2.5 0 0 1-1.353 1.353c-.46.19-1.042.19-2.207.19s-1.747 0-2.207-.19a2.5 2.5 0 0 1-1.353-1.353Zm0-10.5C3 8.497 3 7.915 3 6.75s0-1.747.19-2.207A2.5 2.5 0 0 1 4.543 3.19C5.003 3 5.585 3 6.75 3s1.747 0 2.207.19a2.5 2.5 0 0 1 1.353 1.353c.19.46.19 1.042.19 2.207s0 1.747-.19 2.207a2.5 2.5 0 0 1-1.353 1.353c-.46.19-1.042.19-2.207.19s-1.747 0-2.207-.19A2.5 2.5 0 0 1 3.19 8.957Z" />
    </svg>
  );
}

export function SidebarTierlistIcon({ className = "h-[16px] w-[16px]", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}>
      <path d="M4 15v4m8-10v10m10 3H2m18-9v6" />
      <path d="M5.6 8.8a2 2 0 1 0-3.2 2.4a2 2 0 0 0 3.2-2.4Zm0 0l4.8-3.6m3.39-.305a2 2 0 1 0-3.578-1.79a2 2 0 0 0 3.577 1.79Zm0 0l4.42 2.21m0 0a2 2 0 1 0 3.578 1.79a2 2 0 0 0-3.577-1.79Z" />
    </svg>
  );
}

export function SidebarLeaderboardIcon({ className = "h-[16px] w-[16px]", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}>
      <path d="M5 21h14m-6.875-8.25H12m.25 0a.25.25 0 1 1-.5 0a.25.25 0 0 1 .5 0" />
      <path d="m14.915 7.61-1.107-2.228C13.019 3.794 12.625 3 12 3s-1.019.794-1.808 2.382L9.085 7.61C8.58 8.625 8.329 9.132 7.88 9.246a1 1 0 0 1-.095.02c-.458.07-.886-.3-1.741-1.037C4.012 6.476 2.997 5.6 2.38 5.949a1 1 0 0 0-.114.076c-.564.43-.17 1.716.616 4.29l1.166 3.813c.423 1.384.635 2.076 1.17 2.474S6.473 17 7.91 17h8.178c1.438 0 2.158 0 2.693-.398s.747-1.09 1.17-2.474l1.166-3.813c.787-2.574 1.18-3.86.616-4.29a1 1 0 0 0-.114-.076c-.617-.349-1.632.527-3.664 2.28c-.855.738-1.283 1.107-1.741 1.036a1 1 0 0 1-.095-.019c-.45-.114-.701-.621-1.205-1.635" />
    </svg>
  );
}

export function SidebarSpectateIcon({ className = "h-[16px] w-[16px]", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}>
      <path d="M21.544 11.045c.304.426.456.64.456.955c0 .316-.152.529-.456.955C20.178 14.871 16.689 19 12 19c-4.69 0-8.178-4.13-9.544-6.045C2.152 12.529 2 12.315 2 12c0-.316.152-.529.456-.955C3.822 9.129 7.311 5 12 5c4.69 0 8.178 4.13 9.544 6.045Z" />
      <path d="M15 12a3 3 0 1 0-6 0a3 3 0 0 0 6 0Z" />
    </svg>
  );
}

export function SidebarCollectionsIcon({ className = "h-[16px] w-[16px]", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}>
      <path d="m8.643 3.146-1.705.788C4.313 5.147 3 5.754 3 6.75s1.313 1.603 3.938 2.816l1.705.788c1.652.764 2.478 1.146 3.357 1.146s1.705-.382 3.357-1.146l1.705-.788C19.687 8.353 21 7.746 21 6.75s-1.313-1.603-3.938-2.816l-1.705-.788C13.705 2.382 12.879 2 12 2s-1.705.382-3.357 1.146" />
      <path d="M20.788 11.097c.141.199.212.406.212.634c0 .982-1.313 1.58-3.938 2.776l-1.705.777c-1.652.753-2.478 1.13-3.357 1.13s-1.705-.377-3.357-1.13l-1.705-.777C4.313 13.311 3 12.713 3 11.731c0-.228.07-.435.212-.634" />
      <path d="M20.377 16.266c.415.331.623.661.623 1.052c0 .981-1.313 1.58-3.938 2.776l-1.705.777C13.705 21.624 12.879 22 12 22s-1.705-.376-3.357-1.13l-1.705-.776C4.313 18.898 3 18.299 3 17.318c0-.391.208-.72.623-1.052" />
    </svg>
  );
}

export function SidebarDataStudioIcon({ className = "h-[16px] w-[16px]", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M7 10.842c.602.18 1.274.33 2 .44" />
      <path d="M20 12c0 1.657-3.582 3-8 3s-8-1.343-8-3" />
      <path d="M7 17.842c.602.18 1.274.33 2 .44" />
      <path d="M20 5v14c0 1.657-3.582 3-8 3s-8-1.343-8-3V5" />
    </svg>
  );
}

export function SidebarChampSelectIcon({ className = "h-[16px] w-[16px]", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.65} strokeLinejoin="round" className={className} aria-hidden="true" {...props}>
      <path d="m15 2 .539 2.392a5.39 5.39 0 0 0 4.07 4.07L22 9l-2.392.539a5.39 5.39 0 0 0-4.07 4.07L15 16l-.539-2.392a5.39 5.39 0 0 0-4.07-4.07L8 9l2.392-.539a5.39 5.39 0 0 0 4.07-4.07ZM7 12l.385 1.708a3.85 3.85 0 0 0 2.907 2.907L12 17l-1.708.385a3.85 3.85 0 0 0-2.907 2.907L7 22l-.385-1.708a3.85 3.85 0 0 0-2.907-2.907L2 17l1.708-.385a3.85 3.85 0 0 0 2.907-2.907Z" />
    </svg>
  );
}

export function SidebarPostGameIcon({ className = "h-[16px] w-[16px]", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}>
      <path d="m7.987 9.491-2.31-1.978C4.154 6.203 4.15 4.301 3.987 3.02c1.666.079 2.956.23 4.08 1.179l1.176 1.336 1.273 1.429m8.941 11.454-2.965-3m-2.47 3c.022-.272.2-.978 1.019-1.734c.734-.679 2.327-2.305 3.042-3.01c.406-.4 1.07-.68 1.374-.679m-3.889-.187 1.337 1.479m-3.229.15 1.495 1.313m5.29 2.23c.831.002 1.54.615 1.539 1.445s-.708 1.558-1.538 1.556s-1.471-.732-1.47-1.562c.054-.825.665-1.328 1.47-1.439m-15.866.413 2.958-2.892m-2.992-2.514c.272.022 1.032.204 1.712 1.054c.625.78 2.31 2.29 3.017 3.003c.4.405.68 1.045.68 1.349M7.265 14.23l8.239-9.566c1.34-1.496 3.214-1.529 4.5-1.666c-.112 1.663-.289 2.95-1.26 4.055L8.55 15.926M5.006 19.5A1.503 1.503 0 1 1 2 19.498a1.503 1.503 0 0 1 3.006 0" />
    </svg>
  );
}
