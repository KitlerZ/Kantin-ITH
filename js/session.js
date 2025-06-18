// Session management functions
const SessionManager = {
    init() {
        // Check if we have session data from another tab
        this.checkExistingSession();
        
        // Listen for session changes from other tabs
        window.addEventListener('storage', (e) => {
            if (e.key === 'session_data') {
                this.handleSessionData(JSON.parse(e.newValue));
            }
        });

        this.checkSession();
        // Check session every 5 minutes
        setInterval(() => this.checkSession(), 300000);
    },

    checkExistingSession() {
        const sessionData = localStorage.getItem('session_data');
        if (sessionData) {
            this.handleSessionData(JSON.parse(sessionData));
        }
    },

    handleSessionData(sessionData) {
        if (sessionData && sessionData.userId && sessionData.userRole && sessionData.sessionToken) {
            localStorage.setItem('loggedInUserId', sessionData.userId);
            localStorage.setItem('loggedInUserRole', sessionData.userRole);
            localStorage.setItem('session_token', sessionData.sessionToken);
            localStorage.setItem('username', sessionData.username);
        }
    },

    async login(username, password) {
        try {
            const response = await fetch('../backend/login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'login',
                    username: username,
                    password: password
                })
            });

            const data = await response.json();
            
            if (data.status === 'error') {
                throw new Error(data.message);
            }

            // Store session data
            const sessionData = {
                userId: data.userId,
                userRole: data.role,
                sessionToken: data.session_token,
                username: data.username
            };
            
            localStorage.setItem('session_data', JSON.stringify(sessionData));
            this.handleSessionData(sessionData);
            
            return data;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    },

    async checkSession() {
        try {
            const response = await fetch('../backend/login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'check_session' })
            });

            const data = await response.json();
            
            if (data.status === 'error') {
                this.handleSessionError();
                return false;
            }

            // Update session data and share with other tabs
            const sessionData = {
                userId: data.userId,
                userRole: data.role,
                sessionToken: data.session_token,
                username: data.username
            };
            
            localStorage.setItem('session_data', JSON.stringify(sessionData));
            this.handleSessionData(sessionData);
            
            return true;
        } catch (error) {
            console.error('Session check failed:', error);
            this.handleSessionError();
            return false;
        }
    },

    handleSessionError() {
        // Clear all session data
        localStorage.clear();
        sessionStorage.clear();
        
        // Redirect to login page
        window.location.href = '../index.html';
    },

    validateSession() {
        const userId = localStorage.getItem('loggedInUserId');
        const userRole = localStorage.getItem('loggedInUserRole');
        const sessionToken = localStorage.getItem('session_token');

        if (!userId || !userRole || !sessionToken) {
            this.handleSessionError();
            return false;
        }

        return true;
    }
};

// Initialize session management when the page loads
document.addEventListener('DOMContentLoaded', () => {
    SessionManager.init();
}); 