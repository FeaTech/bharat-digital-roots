import { Link, useRouterState } from "@tanstack/react-router";
import { IdCard, MessagesSquare, Users, Mail, ScrollText, Network, LayoutDashboard, LogOut, History } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { getMyRoleContext } from "@/lib/forum.functions";
import { getMyRole } from "@/lib/members.functions";

type Item = { title: string; url: string; icon: typeof IdCard };

export function AppSidebar() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchCtx = useServerFn(getMyRoleContext);
  const fetchRole = useServerFn(getMyRole);
  const ctxQ = useQuery({ queryKey: ["forum-ctx"], queryFn: () => fetchCtx() });
  const roleQ = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const currentPath = useRouterState({ select: (r) => r.location.pathname });

  const ctx = ctxQ.data;
  const isAdmin = !!roleQ.data?.isAdmin;
  const isSenate = !!ctx?.isSenate;
  const isSenatePresident = !!ctx?.isSenatePresident;
  const isCaucusAdmin = (ctx?.adminAssignments ?? []).some((a) => a.unit_id);

  const personal: Item[] = [
    { title: "Dashboard", url: "/portal", icon: LayoutDashboard },
    { title: "My ID", url: "/portal/id", icon: IdCard },
    { title: "Forum", url: "/portal/forum", icon: MessagesSquare },
  ];

  const admin: Item[] = [];
  if (isAdmin) admin.push({ title: "Members", url: "/portal/members", icon: Users });
  if (isAdmin) admin.push({ title: "Messages", url: "/portal/messages", icon: Mail });

  const senate: Item[] = [];
  if (isSenate) senate.push({ title: "Policies", url: "/portal/policies", icon: ScrollText });
  if (isSenatePresident || isCaucusAdmin) senate.push({ title: "Units", url: "/portal/units", icon: Network });
  if (isAdmin || isSenate) senate.push({ title: "Activity Log", url: "/portal/activity", icon: History });

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/login", replace: true });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-brand-ink/10">
        <div className="px-2 py-2">
          <p className="text-[10px] uppercase tracking-[0.25em] text-brand-saffron font-semibold">Feathers</p>
          <p className="font-serif text-base text-brand-ink leading-tight">Community Forum</p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <Group label="Personal" items={personal} currentPath={currentPath} />
        {admin.length > 0 && <Group label="Admin" items={admin} currentPath={currentPath} />}
        {senate.length > 0 && <Group label="Governance" items={senate} currentPath={currentPath} />}
      </SidebarContent>
      <SidebarFooter className="border-t border-brand-ink/10">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function Group({ label, items, currentPath }: { label: string; items: Item[]; currentPath: string }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = item.url === "/portal" ? currentPath === "/portal" : currentPath.startsWith(item.url);
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link to={item.url} className="flex items-center gap-2">
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
