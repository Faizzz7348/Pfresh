import { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';

interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
}

export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({});

  useEffect(() => {
    // Only run in production
    if (import.meta.env.DEV) return;

    // Page Load Time
    window.addEventListener('load', () => {
      const perfData = performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      
      setMetrics(prev => ({ ...prev, pageLoadTime }));

      // Log slow page loads
      if (pageLoadTime > 3000) {
        console.warn('Slow page load detected:', pageLoadTime, 'ms');
      }
    });

    // Web Vitals - First Contentful Paint (FCP)
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          const fcp = entry.startTime;
          setMetrics(prev => ({ ...prev, firstContentfulPaint: fcp }));
          
          if (fcp > 2500) {
            console.warn('Slow FCP detected:', fcp, 'ms');
          }
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.warn('Performance observer not supported');
    }

    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      const lcp = lastEntry.renderTime || lastEntry.loadTime;
      
      setMetrics(prev => ({ ...prev, largestContentfulPaint: lcp }));

      if (lcp > 4000) {
        console.warn('Slow LCP detected:', lcp, 'ms');
      }
    });

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('LCP observer not supported');
    }

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
          setMetrics(prev => ({ ...prev, cumulativeLayoutShift: clsValue }));
        }
      }

      if (clsValue > 0.25) {
        console.warn('High CLS detected:', clsValue);
      }
    });

    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('CLS observer not supported');
    }

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const fid = (entry as any).processingStart - entry.startTime;
        setMetrics(prev => ({ ...prev, firstInputDelay: fid }));

        if (fid > 100) {
          console.warn('Slow FID detected:', fid, 'ms');
        }
      }
    });

    try {
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.warn('FID observer not supported');
    }

    // Memory monitoring (Chrome only)
    if ('memory' in performance) {
      const checkMemory = () => {
        const memory = (performance as any).memory;
        const usedMemoryMB = memory.usedJSHeapSize / 1048576;
        const totalMemoryMB = memory.jsHeapSizeLimit / 1048576;
        const usagePercent = (usedMemoryMB / totalMemoryMB) * 100;

        if (usagePercent > 90) {
          console.warn('High memory usage detected:', usagePercent.toFixed(2), '%');
          toast({
            title: 'Performance Warning',
            description: 'High memory usage detected. Consider refreshing the page.',
            variant: 'destructive',
          });
        }
      };

      // Check every 30 seconds
      const memoryInterval = setInterval(checkMemory, 30000);
      return () => clearInterval(memoryInterval);
    }

    return () => {
      observer.disconnect();
      lcpObserver.disconnect();
      clsObserver.disconnect();
      fidObserver.disconnect();
    };
  }, []);

  // Function to get performance report
  const getPerformanceReport = () => {
    const report: string[] = [];
    
    if (metrics.pageLoadTime) {
      report.push(`Page Load: ${metrics.pageLoadTime.toFixed(0)}ms`);
    }
    if (metrics.firstContentfulPaint) {
      report.push(`FCP: ${metrics.firstContentfulPaint.toFixed(0)}ms`);
    }
    if (metrics.largestContentfulPaint) {
      report.push(`LCP: ${metrics.largestContentfulPaint.toFixed(0)}ms`);
    }
    if (metrics.cumulativeLayoutShift !== undefined) {
      report.push(`CLS: ${metrics.cumulativeLayoutShift.toFixed(3)}`);
    }
    if (metrics.firstInputDelay) {
      report.push(`FID: ${metrics.firstInputDelay.toFixed(0)}ms`);
    }

    return report.join(' | ');
  };

  return { metrics, getPerformanceReport };
}
