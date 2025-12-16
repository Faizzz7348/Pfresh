import { useEffect } from 'react';
import { useToast } from './use-toast';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  category?: 'navigation' | 'edit' | 'general';
}

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled: boolean = true
) {
  const { toast } = useToast();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore shortcuts when typing in inputs, textareas, or contenteditable elements
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow specific shortcuts even in inputs (like Escape)
        if (event.key !== 'Escape') {
          return;
        }
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrlKey ? event.ctrlKey : !event.ctrlKey;
        const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.altKey ? event.altKey : !event.altKey;
        const metaMatch = shortcut.metaKey ? event.metaKey : !event.metaKey;

        // Handle Cmd/Ctrl for cross-platform compatibility
        const modifierMatch = shortcut.ctrlKey || shortcut.metaKey
          ? event.ctrlKey || event.metaKey
          : ctrlMatch && metaMatch;

        if (keyMatch && modifierMatch && shiftMatch && altMatch) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);

  // Function to show available shortcuts
  const showShortcutsHelp = () => {
    const categories = {
      navigation: shortcuts.filter(s => s.category === 'navigation'),
      edit: shortcuts.filter(s => s.category === 'edit'),
      general: shortcuts.filter(s => s.category === 'general'),
    };

    const formatKey = (shortcut: KeyboardShortcut) => {
      const parts = [];
      if (shortcut.ctrlKey || shortcut.metaKey) parts.push('Ctrl/Cmd');
      if (shortcut.shiftKey) parts.push('Shift');
      if (shortcut.altKey) parts.push('Alt');
      parts.push(shortcut.key.toUpperCase());
      return parts.join(' + ');
    };

    let message = '⌨️ **Keyboard Shortcuts**\n\n';
    
    if (categories.navigation.length > 0) {
      message += '**Navigation:**\n';
      categories.navigation.forEach(s => {
        message += `• ${formatKey(s)} - ${s.description}\n`;
      });
      message += '\n';
    }

    if (categories.edit.length > 0) {
      message += '**Edit Mode:**\n';
      categories.edit.forEach(s => {
        message += `• ${formatKey(s)} - ${s.description}\n`;
      });
      message += '\n';
    }

    if (categories.general.length > 0) {
      message += '**General:**\n';
      categories.general.forEach(s => {
        message += `• ${formatKey(s)} - ${s.description}\n`;
      });
    }

    toast({
      title: 'Keyboard Shortcuts',
      description: message,
      duration: 8000,
    });
  };

  return { showShortcutsHelp };
}
