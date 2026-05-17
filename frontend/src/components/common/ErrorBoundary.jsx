import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                    <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 border border-red-100 text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle size={32} className="text-red-500" />
                        </div>

                        <h1 className="text-2xl font-bold text-slate-800 mb-2">
                            Something went wrong
                        </h1>

                        <p className="text-slate-500 mb-6">
                            We're sorry, but an unexpected error occurred. Our team has been notified.
                        </p>

                        <div className="bg-slate-50 rounded-lg p-4 mb-8 text-left overflow-auto max-h-40 text-xs text-slate-600 border border-slate-200">
                            <span className="font-mono">{this.state.error?.toString()}</span>
                        </div>

                        <button
                            onClick={this.handleReload}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg shadow-indigo-500/20"
                        >
                            <RefreshCw size={20} />
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
