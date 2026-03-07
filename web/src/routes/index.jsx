import { createBrowserRouter } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Home from '../pages/Home/Home';
import About from '../pages/About/About';
import Products from '../pages/Products/Products';
import Contact from '../pages/Contact/Contact';
import Login from '../pages/Login/Login';
import Register from '../pages/Register/Register';
import AddFriends from '../pages/AddFriends/AddFriends';
import Messages from '../pages/Messages/Messages';
import Notifications from '../pages/Notifications/Notifications';
import Settings from '../pages/Settings/Settings';

const router = createBrowserRouter([
    {
        path: '/login',
        element: <Login />,
    },
    {
        path: '/register',
        element: <Register />,
    },
    {
        path: '/',
        element: <Layout />,
        children: [
            {
                index: true,
                element: <Home />,
            },
            {
                path: 'about',
                element: <About />,
            },
            {
                path: 'products',
                element: <Products />,
            },
            {
                path: 'contact',
                element: <Contact />,
            },
            {
                path: 'add-friends',
                element: <AddFriends />,
            },
            {
                path: 'messages',
                element: <Messages />,
            },
            {
                path: 'notifications',
                element: <Notifications />,
            },
            {
                path: 'settings',
                element: <Settings />,
            },
        ],
    },
]);

export default router;

