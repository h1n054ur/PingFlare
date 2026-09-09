import { useEffect, useState } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { useSession } from "../lib/auth-client";
import { useAuth, adminLogout } from "../lib/api";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  TransitionChild,
} from "@headlessui/react";
import {
  Bars3Icon,
  BellIcon,
  ChartBarSquareIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  SignalIcon,
  Squares2X2Icon,
  UsersIcon,
  WrenchIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { ChevronDownIcon, MagnifyingGlassIcon } from "@heroicons/react/20/solid";

function classNames(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const monitoringNav = [
  { name: "Overview", to: "/admin", icon: ChartBarSquareIcon, end: true },
  { name: "Monitors", to: "/admin/monitors", icon: SignalIcon, end: false },
  { name: "Components", to: "/admin/components", icon: Squares2X2Icon, end: false },
  { name: "Incidents", to: "/admin/incidents", icon: ExclamationTriangleIcon, end: false },
  { name: "Maintenance", to: "/admin/maintenance", icon: WrenchIcon, end: false },
];

const engagementNav = [
  { name: "Subscribers", to: "/admin/subscribers", icon: UsersIcon, end: false },
  { name: "Notifications", to: "/admin/notifications", icon: BellIcon, end: false },
];

function Logo() {
  return (
    <div className="flex h-16 shrink-0 items-center">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <rect x="2" y="2" width="28" height="28" rx="8" className="fill-indigo-500" />
        <path
          d="M7 16.5h5l2-5 4 10 2-5h5"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="ml-3 text-lg font-semibold tracking-tight text-white">PingFlare</span>
    </div>
  );
}

function SidebarNav() {
  return (
    <nav className="flex flex-1 flex-col">
      <ul role="list" className="flex flex-1 flex-col gap-y-7">
        <li>
          <div className="text-xs/6 font-semibold text-gray-400">Monitoring</div>
          <ul role="list" className="-mx-2 mt-2 space-y-1">
            {monitoringNav.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    classNames(
                      isActive
                        ? "bg-gray-800 text-white"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white",
                      "group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold"
                    )}
                  >
                    <item.icon aria-hidden="true" className="size-6 shrink-0" />
                    {item.name}
                  </NavLink>
                </li>
              ))}
          </ul>
        </li>
        <li>
          <div className="text-xs/6 font-semibold text-gray-400">Engagement</div>
          <ul role="list" className="-mx-2 mt-2 space-y-1">
            {engagementNav.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    classNames(
                      isActive
                        ? "bg-gray-800 text-white"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white",
                      "group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold"
                    )}
                  >
                    <item.icon aria-hidden="true" className="size-6 shrink-0" />
                    {item.name}
                  </NavLink>
                </li>
              ))}
          </ul>
        </li>
        <li className="mt-auto">
          <NavLink
            to="/admin/settings"
            className={({ isActive }) =>
              classNames(
                isActive ? "bg-gray-800 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white",
                "group -mx-2 flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold"
              )
            }
          >
            <Cog6ToothIcon aria-hidden="true" className="size-6 shrink-0" />
            Settings
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

function MobileSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: (value: boolean) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50 lg:hidden">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"
      />

      <div className="fixed inset-0 flex">
        <DialogPanel
          transition
          className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full"
        >
          <TransitionChild>
            <div className="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0">
              <button type="button" onClick={() => onClose(false)} className="-m-2.5 p-2.5">
                <span className="sr-only">Close sidebar</span>
                <XMarkIcon aria-hidden="true" className="size-6 text-white" />
              </button>
            </div>
          </TransitionChild>

          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-4 ring-1 ring-white/10">
            <Logo />
            <SidebarNav />
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export default function AdminLayout() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = session?.user;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/admin/login");
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  const userInitials =
    (user?.name || user?.email || "?")
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  return (
    <div>
      <MobileSidebar open={sidebarOpen} onClose={setSidebarOpen} />

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-4">
          <Logo />
          <SidebarNav />
        </div>
      </div>

      <div className="lg:pl-72">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-xs sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon aria-hidden="true" className="size-6" />
          </button>

          {/* Separator */}
          <div aria-hidden="true" className="h-6 w-px bg-gray-900/10 lg:hidden" />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <form
              onSubmit={(e) => e.preventDefault()}
              className="grid flex-1 grid-cols-1"
            >
              <input
                name="search"
                type="search"
                placeholder="Search"
                aria-label="Search"
                className="col-start-1 row-start-1 block size-full bg-white pl-8 text-base text-gray-900 outline-hidden placeholder:text-gray-400 sm:text-sm/6"
              />
              <MagnifyingGlassIcon
                aria-hidden="true"
                className="pointer-events-none col-start-1 row-start-1 size-5 self-center text-gray-400"
              />
            </form>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <NavLink
                to="/admin/notifications"
                className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">View notifications</span>
                <BellIcon aria-hidden="true" className="size-6" />
              </NavLink>

              {/* Separator */}
              <div
                aria-hidden="true"
                className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-900/10"
              />

              {/* Profile dropdown */}
              <Menu as="div" className="relative">
                <MenuButton className="relative flex items-center">
                  <span className="absolute -inset-1.5" />
                  <span className="sr-only">Open user menu</span>
                  <span className="flex size-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                    {userInitials}
                  </span>
                  <span className="hidden lg:flex lg:items-center">
                    <span
                      aria-hidden="true"
                      className="ml-4 text-sm/6 font-semibold text-gray-900"
                    >
                      {user?.name || "Admin"}
                    </span>
                    <ChevronDownIcon
                      aria-hidden="true"
                      className="ml-2 size-5 text-gray-400"
                    />
                  </span>
                </MenuButton>
                <MenuItems
                  transition
                  className="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 transition focus:outline-hidden data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
                >
                  <MenuItem>
                    <NavLink
                      to="/admin/settings"
                      className="block px-3 py-1 text-sm/6 text-gray-900 data-focus:bg-gray-50 data-focus:outline-hidden"
                    >
                      Account settings
                    </NavLink>
                  </MenuItem>
                  <MenuItem>
                    <button
                      type="button"
                      onClick={() => {
                        adminLogout();
                        navigate("/admin/login");
                      }}
                      className="block w-full px-3 py-1 text-left text-sm/6 text-gray-900 data-focus:bg-gray-50 data-focus:outline-hidden"
                    >
                      Sign out
                    </button>
                  </MenuItem>
                </MenuItems>
              </Menu>
            </div>
          </div>
        </div>

        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
