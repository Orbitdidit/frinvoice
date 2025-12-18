import Clients from './pages/Clients';
import CreateInvoice from './pages/CreateInvoice';
import Dashboard from './pages/Dashboard';
import EditInvoice from './pages/EditInvoice';
import Estimates from './pages/Estimates';
import Home from './pages/Home';
import InvoiceDetail from './pages/InvoiceDetail';
import Invoices from './pages/Invoices';
import PaymentCancelled from './pages/PaymentCancelled';
import PaymentSuccess from './pages/PaymentSuccess';
import PublicInvoice from './pages/PublicInvoice';
import Settings from './pages/Settings';
import VoiceInvoice from './pages/VoiceInvoice';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Clients": Clients,
    "CreateInvoice": CreateInvoice,
    "Dashboard": Dashboard,
    "EditInvoice": EditInvoice,
    "Estimates": Estimates,
    "Home": Home,
    "InvoiceDetail": InvoiceDetail,
    "Invoices": Invoices,
    "PaymentCancelled": PaymentCancelled,
    "PaymentSuccess": PaymentSuccess,
    "PublicInvoice": PublicInvoice,
    "Settings": Settings,
    "VoiceInvoice": VoiceInvoice,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};