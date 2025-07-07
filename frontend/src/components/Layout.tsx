import React from 'react';
import {
  LayoutDashboard,
  Radio,
  FileText,
  Settings,
  LogOut,
  ChevronRight,
  Zap,
  Plus,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/index';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '../lib/utils';
import PageTransition from './PageTransition';
import { motion } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  {
    text: 'Главная',
    icon: <LayoutDashboard className="h-4 w-4" />,
    path: '/',
  },
  {
    text: 'Каналы',
    icon: <Radio className="h-4 w-4" />,
    path: '/channels',
  },
  {
    text: 'Посты',
    icon: <FileText className="h-4 w-4" />,
    path: '/posts',
  },
  {
    text: 'Создать пост',
    icon: <Plus className="h-4 w-4" />,
    path: '/posts/create',
    isSubItem: true,
  },
  {
    text: 'Настройки',
    icon: <Settings className="h-4 w-4" />,
    path: '/settings',
  },
];

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Основные пункты меню для нижней навигации (исключаем настройки)
  const bottomNavItems = menuItems.filter(item => item.path !== '/settings');

  const sidebarContent = (
    <div className="flex flex-col h-full bg-gradient-to-b from-sidebar via-sidebar to-sidebar/95">
      {/* Header with logo and branding */}
      <div className="relative p-6 border-b border-sidebar-border/30 bg-gradient-to-br from-sidebar-accent/20 via-transparent to-sidebar-accent/10">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 opacity-50" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        
        <div className="relative flex items-center gap-4">
          {/* Enhanced logo with multiple layers */}
          <div className="relative group">
            {/* Outer glow ring */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/60 to-secondary rounded-2xl blur-sm opacity-75 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Main logo container */}
            <div className="relative p-3 bg-gradient-to-br from-primary via-primary/90 to-primary/70 rounded-2xl shadow-xl shadow-primary/25 group-hover:shadow-primary/40 transition-all duration-300 group-hover:scale-105">
              {/* Inner highlight */}
              <div className="absolute inset-1 bg-gradient-to-br from-white/20 to-transparent rounded-xl" />
              
              {/* Icon */}
              <Zap className="relative h-6 w-6 text-primary-foreground drop-shadow-sm" />
              
              {/* Animated pulse effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
            
            {/* Floating particles effect */}
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-br from-secondary to-secondary/80 rounded-full opacity-60 animate-pulse" />
            <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-gradient-to-br from-primary/60 to-primary/40 rounded-full opacity-40 animate-pulse" style={{animationDelay: '0.5s'}} />
          </div>
          
          {/* Text content with enhanced styling */}
          <div className="flex-1">
            <h2 className="text-xl font-bold relative group">
              {/* Gradient background that adapts to theme */}
                <span className="text-primary font-extrabold dark:text-primary/90">ContentFlow</span>
            </h2>
            
          </div>
        </div>
        
        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-sidebar-border/50 to-transparent" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <div className="mb-4">
          <p className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-3 mb-3">
            Основное
          </p>
        </div>
        
        <ul className="space-y-1">
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path || (item.path === '/posts' && location.pathname === '/posts/create');
            return (
              <li key={item.text}>
                <motion.button
                  onClick={() => {
                    navigate(item.path);
                  }}
                  className={cn(
                    "group w-full flex items-center gap-3 text-sm rounded-xl transition-all duration-200 relative overflow-hidden",
                    item.isSubItem ? "px-6 py-2 ml-3" : "px-3 py-3",
                    isActive
                      ? "bg-gradient-to-r from-sidebar-primary to-sidebar-primary/90 text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25 scale-[1.02]"
                      : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground hover:scale-[1.01] text-sidebar-foreground/80 hover:shadow-md"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sidebar-primary-foreground/80 to-sidebar-primary-foreground/40 rounded-r-full" />
                  )}
                  
                  {/* Icon with enhanced styling */}
                  <div className={cn(
                    "flex-shrink-0 rounded-lg transition-all duration-200",
                    item.isSubItem ? "p-1" : "p-1.5",
                    isActive 
                      ? "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground" 
                      : "group-hover:bg-sidebar-accent group-hover:text-sidebar-accent-foreground text-sidebar-foreground/60"
                  )}>
                    {item.icon}
                  </div>
                  
                  {/* Text */}
                  <span className={cn(
                    "font-medium flex-1 text-left",
                    item.isSubItem && "text-xs"
                  )}>
                    {item.text}
                  </span>
                  
                  {/* Arrow indicator for active item */}
                  {isActive && (
                    <ChevronRight className="h-4 w-4 text-sidebar-primary-foreground/60" />
                  )}
                  
                  {/* Hover effect overlay */}
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                    !isActive && "group-hover:opacity-100"
                  )} />
                </motion.button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer with user info */}
      <div className="p-4 border-t border-sidebar-border/50 bg-sidebar-accent/20">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent/30 border border-sidebar-border/30">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm">
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.username || 'Пользователь'}
            </p>
            <p className="text-xs text-sidebar-foreground/60">Администратор</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-x-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-sidebar-border/50 bg-sidebar shadow-xl shadow-black/5">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar - removed for mobile-only bottom navigation */}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="bg-card border-b px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Desktop only - no mobile menu button needed */}
              <h1 className="text-lg sm:text-xl font-semibold truncate">
                {menuItems.find(item => item.path === location.pathname)?.text || 'ContentFlow'}
              </h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 lg:gap-4">
              <span className="hidden sm:block text-sm text-muted-foreground truncate max-w-32 lg:max-w-none">
                Добро пожаловать, {user?.username}
              </span>
              <ThemeToggle />
              <Button variant="ghost" onClick={handleLogout} className="gap-1 sm:gap-2 px-2 sm:px-3">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Выйти</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-3 sm:p-4 lg:p-6 pb-24 lg:pb-6 overflow-x-hidden">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50">
        <div className="flex items-center justify-around px-2 py-2">
          {bottomNavItems.map((item) => (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-0 flex-1",
                location.pathname === item.path
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <div className="flex-shrink-0">
                {item.icon}
              </div>
              <span className="text-xs font-medium truncate max-w-full">
                {item.text.split(' ')[0]}
              </span>
            </motion.button>
          ))}
          {/* Settings button */}
          <motion.button
            onClick={() => navigate('/settings')}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-0 flex-1",
              location.pathname === '/settings'
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <div className="flex-shrink-0">
              <Settings className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium truncate max-w-full">
              Настройки
            </span>
          </motion.button>
        </div>
      </nav>
    </div>
  );
}