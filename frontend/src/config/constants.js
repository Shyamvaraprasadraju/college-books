// Email Domain Configuration
// Load allowed domains from environment variable
// Supports multiple domains (comma-separated): e.g., "amman.ac.in,nriit.edu.in"
// Leave empty to allow all email domains
const ALLOWED_EMAIL_DOMAINS_ENV = import.meta.env.VITE_ALLOWED_EMAIL_DOMAINS || '';

/**
 * Get array of allowed domains from environment variable
 * @returns {string[]} - Array of allowed domains (without @ prefix)
 */
const getAllowedDomains = () => {
    if (!ALLOWED_EMAIL_DOMAINS_ENV || ALLOWED_EMAIL_DOMAINS_ENV.trim() === '') {
        return [];
    }

    return ALLOWED_EMAIL_DOMAINS_ENV
        .split(',')
        .map(domain => domain.trim().toLowerCase())
        .filter(domain => domain.length > 0);
};

/**
 * Validates if an email matches any of the allowed domains
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidEmailDomain = (email) => {
    if (!email) return false;

    const allowedDomains = getAllowedDomains();

    // If no domain restriction, allow all emails
    if (allowedDomains.length === 0) {
        return true;
    }

    // Extract domain from email (everything after @)
    const emailParts = email.toLowerCase().split('@');
    if (emailParts.length !== 2) return false;

    const emailDomain = emailParts[1];

    // Check if email domain matches any allowed domain
    return allowedDomains.some(allowedDomain => emailDomain === allowedDomain);
};

export const DEPARTMENTS = [
    'CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIML', 'CSD', 'CSM', 'FED', 'MBA', 'PHARMACY'
];

/**
 * Get error message for invalid domain
 * @returns {string} - Error message
 */
export const getEmailDomainError = () => {
    const allowedDomains = getAllowedDomains();

    if (allowedDomains.length === 0) {
        return 'Please enter a valid email address';
    }

    if (allowedDomains.length === 1) {
        return `Please use your institutional email (@${allowedDomains[0]})`;
    }

    return `Please use one of these domains: ${allowedDomains.map(d => '@' + d).join(', ')}`;
};

// Export for use in other components (optional)
export const ALLOWED_EMAIL_DOMAINS = getAllowedDomains();
