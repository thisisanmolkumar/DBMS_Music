import { AuthProvider } from "./auth/AuthContext";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./styles/theme.css";
import HomePage from "./components/Home/HomePage";

const App = () => {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
};

export default App;
