import Dashboard from './pages/Dashboard';
import VoiceInvoice from './pages/VoiceInvoice';
import Invoices from './pages/Invoices';
import Clients from './pages/Clients';
import Settings from './pages/Settings';
import InvoiceDetail from './pages/InvoiceDetail';
import EditInvoice from './pages/EditInvoice';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancelled from './pages/PaymentCancelled';
import PublicInvoice from './pages/PublicInvoice';
import CreateInvoice from './pages/CreateInvoice';
import Estimates from './pages/Estimates';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "VoiceInvoice": VoiceInvoice,
    "Invoices": Invoices,
    "Clients": Clients,
    "Settings": Settings,
    "InvoiceDetail": InvoiceDetail,
    "EditInvoice": EditInvoice,
    "PaymentSuccess": PaymentSuccess,
    "PaymentCancelled": PaymentCancelled,
    "PublicInvoice": PublicInvoice,
    "CreateInvoice": CreateInvoice,
    "Estimates": Estimates,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};