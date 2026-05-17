import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#FAFBFD] flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                <div className="mb-8 relative">
                    <h1 className="text-9xl font-black text-slate-100">404</h1>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-slate-700 bg-[#FAFBFD] px-4">
                            Page Not Found
                        </span>
                    </div>
                </div>

                <p className="text-slate-400 mb-8">
                    The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center gap-2 px-5 py-3 border border-slate-200 rounded-lg text-slate-600 font-medium hover:bg-white transition-all"
                    >
                        <ArrowLeft size={18} />
                        Go Back
                    </button>

                    <button
                        onClick={() => navigate("/")}
                        className="flex items-center justify-center gap-2 px-5 py-3 bg-[#1B2845] text-white rounded-lg font-medium hover:bg-[#243656] transition-all"
                    >
                        <Home size={18} />
                        Home Page
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
