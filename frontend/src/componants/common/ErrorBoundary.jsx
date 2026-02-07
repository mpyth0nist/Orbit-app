import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary - Catches React errors and displays fallback UI
 * Prevents entire app from crashing when a component throws an error
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details for debugging
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // You can also log to an error reporting service here
        // Example: logErrorToService(error, errorInfo);

        this.setState({
            error,
            errorInfo
        });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    render() {
        if (this.state.hasError) {
            return <ErrorFallback
                error={this.state.error}
                onReset={this.handleReset}
                onGoHome={this.props.onGoHome}
            />;
        }

        return this.props.children;
    }
}

/**
 * ErrorFallback - UI displayed when an error is caught
 */
function ErrorFallback({ error, onReset, onGoHome }) {
    const { isDarkMode } = useTheme();

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
            }`}>
            <div className={`max-w-md w-full rounded-3xl p-8 text-center shadow-xl ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'
                }`}>
                {/* Error Icon */}
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
                        <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-400" />
                    </div>
                </div>

                {/* Error Message */}
                <h1 className={`text-2xl font-bold mb-3 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                    }`}>
                    Oops! Something went wrong
                </h1>

                <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                    We encountered an unexpected error. Don't worry, your data is safe.
                </p>

                {/* Error Details (Development only) */}
                {process.env.NODE_ENV === 'development' && error && (
                    <details className={`mb-6 text-left rounded-xl p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
                        }`}>
                        <summary className={`cursor-pointer font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                            Error Details (Dev Only)
                        </summary>
                        <pre className={`text-xs overflow-auto ${isDarkMode ? 'text-red-400' : 'text-red-600'
                            }`}>
                            {error.toString()}
                        </pre>
                    </details>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={onReset}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-full font-medium hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                    </button>

                    {onGoHome && (
                        <button
                            onClick={onGoHome}
                            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${isDarkMode
                                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <Home className="w-4 h-4" />
                            Go Home
                        </button>
                    )}
                </div>

                {/* Help Text */}
                <p className={`text-xs mt-6 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                    If this problem persists, please contact support
                </p>
            </div>
        </div>
    );
}

export default ErrorBoundary;
