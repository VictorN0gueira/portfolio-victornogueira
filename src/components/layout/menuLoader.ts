/**
 * How the code of the mobile menu is requested. One function, so the header prefetches and lazy loads through the
 * same call, and a test can stand in for the network by replacing this module.
 */
export const loadMobileMenu = () => import('./MobileMenu');
