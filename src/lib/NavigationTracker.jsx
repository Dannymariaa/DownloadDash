import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import downloadDash from '@/api/downloadDashClient';
import { pagesConfig } from '@/pages.config';
import { getPageNameFromPath } from '@/utils';

export default function NavigationTracker() {
    const location = useLocation();
    const { isAuthenticated } = useAuth();
    const { Pages, mainPage } = pagesConfig;
    const mainPageKey = mainPage ?? Object.keys(Pages)[0];
    const pageTitles = {
        Home: 'DownloadDash | Public Media Saving Platform',
        RecommendedApps: 'DownloadDash Guides',
        HowDownloadDashWorks: 'How DownloadDash Works',
        SupportedPlatforms: 'Supported Platforms | DownloadDash',
        Troubleshooting: 'Troubleshooting | DownloadDash',
        ResponsibleUse: 'Responsible Use | DownloadDash',
        Blog: 'DownloadDash Blog',
        PrivacyPolicy: 'Privacy Policy | DownloadDash',
        TermsOfService: 'Terms of Service | DownloadDash',
        Disclaimer: 'Disclaimer | DownloadDash',
        Contact: 'Contact | DownloadDash',
        About: 'About DownloadDash',
        FAQ: 'DownloadDash FAQ',
        Transparency: 'Transparency | DownloadDash',
        DMCA: 'DMCA & Copyright | DownloadDash',
    };

    // Log user activity when navigating to a page
    useEffect(() => {
        // Extract page name from pathname
        const pathname = location.pathname;
        const pageName = getPageNameFromPath(pathname) || (pathname === '/' || pathname === '' ? mainPageKey : null);

        if (isAuthenticated && pageName) {
            downloadDash.appLogs.logUserInApp(pageName).catch(() => {
                // Silently fail - logging shouldn't break the app
            });
        }

        window.scrollTo({ top: 0, behavior: 'auto' });
        document.title = pageTitles[pageName] || 'DownloadDash';
    }, [location, isAuthenticated, Pages, mainPageKey]);

    return null;
}
