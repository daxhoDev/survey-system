import { ClipboardList, UserPlus } from "lucide-react";
import { Link, useLocation } from "react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "./ui/sidebar";
import logoLight from "@/assets/brand/logo-light.svg";
import logoDark from "@/assets/brand/logo-dark.svg";
import isotype from "@/assets/brand/isotype-gradient.svg";

// Side navigation (BRAND-22, FE-31): only sections that exist; collapses to
// icons on desktop and opens as a sheet on mobile.
const sections = [
  {
    items: [
      {
        to: "/dashboard",
        label: "Encuestas",
        icon: ClipboardList,
        isActive: (path: string) =>
          path === "/dashboard" || path.startsWith("/dashboard/surveys"),
      },
    ],
  },
  {
    label: "Administración",
    items: [
      {
        to: "/dashboard/invitations",
        label: "Invitaciones",
        icon: UserPlus,
        isActive: (path: string) => path.startsWith("/dashboard/invitations"),
      },
    ],
  },
];

export default function AppSidebar() {
  const { pathname } = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 justify-center border-b border-sidebar-border">
        <Link
          to="/dashboard"
          aria-label="Sondix, ir a encuestas"
          onClick={closeOnMobile}
          className="flex items-center rounded-sm px-1 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
        >
          <img
            src={logoLight}
            alt=""
            className="h-7 w-auto dark:hidden group-data-[collapsible=icon]:hidden!"
          />
          <img
            src={logoDark}
            alt=""
            className="hidden h-7 w-auto dark:block group-data-[collapsible=icon]:hidden!"
          />
          <img
            src={isotype}
            alt=""
            className="hidden size-6 group-data-[collapsible=icon]:block"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {sections.map((section, i) => (
          <SidebarGroup key={section.label ?? i}>
            {section.label && (
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            )}
            <SidebarMenu>
              {section.items.map(({ to, label, icon: Icon, isActive }) => {
                const active = isActive(pathname);
                return (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton asChild isActive={active} tooltip={label}>
                      <Link
                        to={to}
                        aria-current={active ? "page" : undefined}
                        onClick={closeOnMobile}
                      >
                        <Icon />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
