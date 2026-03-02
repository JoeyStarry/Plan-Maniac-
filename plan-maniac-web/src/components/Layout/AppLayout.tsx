import React from 'react';
import { Layout, Menu, Avatar, Dropdown, Typography } from 'antd';
import logoImg from '../../assets/logo.png';
import {
  HomeOutlined,
  CheckSquareOutlined,
  MessageOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useApp } from '../../stores/AppContext';
import './AppLayout.css';

const { Header, Content } = Layout;
const { Text } = Typography;

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useApp();

  const menuItems = [
    { key: '/home', icon: <HomeOutlined />, label: '首页' },
    { key: '/today', icon: <CheckSquareOutlined />, label: 'Today' },
    { key: '/plan-chat', icon: <MessageOutlined />, label: 'Plan Chat' },
  ];

  const currentKey = '/' + location.pathname.split('/')[1];

  const dropdownItems = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: '用户信息',
        onClick: () => navigate('/profile'),
      },
      { type: 'divider' as const },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        danger: true,
        onClick: () => {
          logout();
          navigate('/login');
        },
      },
    ],
  };

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="header-left">
          <div className="logo" onClick={() => navigate('/home')}>
            <img src={logoImg} alt="Logo" className="logo-icon-img" />
            <span className="logo-text">Plan Maniac</span>
          </div>
          <Menu
            mode="horizontal"
            selectedKeys={[currentKey]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            className="nav-menu"
            disabledOverflow={true} // 关闭自动溢出折叠（三点菜单）功能
          />
        </div>
        <div className="header-right">
          <Dropdown menu={dropdownItems} placement="bottomRight">
            <div className="user-info">
              <Text className="user-nickname">{user?.nickname || 'User'}</Text>
              <Avatar
                size={36}
                icon={<UserOutlined />}
                src={user?.avatar || undefined}
                className="user-avatar"
              />
            </div>
          </Dropdown>
        </div>
      </Header>
      <Content className="app-content">
        <Outlet />
      </Content>
    </Layout>
  );
};

export default AppLayout;
