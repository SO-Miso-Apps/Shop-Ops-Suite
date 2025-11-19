/**
 * DevTools Component
 *
 * Development-only floating toolbar for toggling between mock and real data.
 * Only visible in development mode. Includes keyboard shortcut (Ctrl+Shift+M).
 */

import { useEffect, useState } from 'react';
import { Badge, Button, Card, InlineStack, Text, Toast } from '@shopify/polaris';
import { isDevelopment } from '~/utils/env';
import { resetDataService } from '~/services/data';

/**
 * DevTools Component
 *
 * @example
 * ```tsx
 * // Add to root layout
 * <DevTools />
 * ```
 */
export function DevTools() {
  const [isVisible, setIsVisible] = useState(false);
  const [useMockData, setUseMockData] = useState(true);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    // Check current mode from localStorage
    const stored = localStorage.getItem('use_mock_data');
    if (stored !== null) {
      setUseMockData(stored === 'true');
    } else {
      setUseMockData(true);
    }

    // Keyboard shortcut: Ctrl+Shift+M
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  // Only render in development
  if (!isDevelopment()) {
    return null;
  }

  const handleToggle = () => {
    const newValue = !useMockData;
    setUseMockData(newValue);

    // Persist to localStorage
    localStorage.setItem('use_mock_data', String(newValue));

    // Reset data service to pick up new mode
    resetDataService();

    // Show toast notification
    setShowToast(true);

    // Reload page to ensure all components use new data source
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const toggleVisibility = () => {
    setIsVisible(prev => !prev);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999
        }}
      >
        {!isVisible ? (
          <Button onClick={toggleVisibility} size="large">
            🛠️ DevTools
          </Button>
        ) : (
          <Card>
            <div style={{ minWidth: '280px' }}>
              <InlineStack align="space-between" blockAlign="center">
                <Text variant="headingSm" as="h3">
                  DevTools
                </Text>
                <Button onClick={toggleVisibility} plain>
                  ✕
                </Button>
              </InlineStack>

              <div style={{ marginTop: '12px' }}>
                <InlineStack align="space-between" blockAlign="center">
                  <div>
                    <Text variant="bodyMd" as="p">
                      Data Mode
                    </Text>
                    <Badge tone={useMockData ? 'info' : 'success'}>
                      {useMockData ? 'Mock Data' : 'Real Data'}
                    </Badge>
                  </div>

                  <Button onClick={handleToggle} tone={useMockData ? 'success' : 'critical'}>
                    {useMockData ? 'Switch to Real' : 'Switch to Mock'}
                  </Button>
                </InlineStack>
              </div>

              <div style={{ marginTop: '12px' }}>
                <Text variant="bodySm" as="p" tone="subdued">
                  Keyboard shortcut: Ctrl+Shift+M
                </Text>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Toast Notification */}
      {showToast && (
        <Toast
          content={`Switched to ${useMockData ? 'Mock' : 'Real'} Data. Reloading...`}
          onDismiss={() => setShowToast(false)}
          duration={3000}
        />
      )}
    </>
  );
}
