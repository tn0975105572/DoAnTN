/* eslint-disable react-refresh/only-export-components */
import { Suspense, lazy } from 'react';
import { Navigate, createBrowserRouter, useLocation } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Home from '../pages/Home/Home';
import MapPage from '../pages/Map/Map';
import About from '../pages/About/About';
import Contact from '../pages/Contact/Contact';
import Login from '../pages/Login/Login';
import Register from '../pages/Register/Register';
import AddFriends from '../pages/AddFriends/AddFriends';
import Messages from '../pages/Messages/Messages';
import Notifications from '../pages/Notifications/Notifications';
import Settings from '../pages/Settings/Settings';
import PostComments from '../pages/PostComments/PostComments';
import Profile from '../pages/Profile/Profile';
import CreatePost from '../pages/CreatePost/CreatePost';
import LikedPosts from '../pages/LikedPosts/LikedPosts';
import Orders from '../pages/Orders/Orders';
import OrderDetail from '../pages/OrderDetail/OrderDetail';
import PostDetail from '../pages/PostDetail/PostDetail';
import { useAuthSession } from '../utils/authSession';

const AdminBankDash = lazy(() => import('../pages/Admin/AdminBankDash'));

function RequireAuth({ children }) {
    const location = useLocation();
    const { token, userId } = useAuthSession();

    if (!token || !userId) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return children;
}

function RedirectIfAuthenticated({ children }) {
    const { token, userId } = useAuthSession();

    if (token && userId) {
        return <Navigate to="/" replace />;
    }

    return children;
}

const router = createBrowserRouter([
    {
        path: '/login',
        element: (
            <RedirectIfAuthenticated>
                <Login />
            </RedirectIfAuthenticated>
        ),
    },
    {
        path: '/register',
        element: (
            <RedirectIfAuthenticated>
                <Register />
            </RedirectIfAuthenticated>
        ),
    },
    {
        path: '/',
        element: (
            <RequireAuth>
                <Layout />
            </RequireAuth>
        ),
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
                path: 'map',
                element: <MapPage />,
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
                path: 'liked-posts',
                element: <LikedPosts />,
            },
            {
                path: 'settings',
                element: <Settings />,
            },
            {
                path: 'profile',
                element: <Profile />,
            },
            {
                path: 'profile/:userId',
                element: <Profile />,
            },
            {
                path: 'create-post',
                element: <CreatePost />,
            },
            {
                path: 'orders',
                element: <Orders />,
            },
            {
                path: 'orders/:orderId',
                element: <OrderDetail />,
            },
            {
                path: 'create-post/:postId/edit',
                element: <CreatePost />,
            },
            {
                path: 'admin',
                element: (
                    <Suspense fallback={null}>
                        <AdminBankDash />
                    </Suspense>
                ),
            },
            {
                path: 'post/:postId',
                element: <PostDetail />,
            },
            {
                path: 'post/:postId/comments',
                element: <PostComments />,
            },
        ],
    },
]);

export default router;
