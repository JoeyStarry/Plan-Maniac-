import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Checkbox, Typography, message } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { useApp } from '../../stores/AppContext';
import logoImg from '../../assets/logo.png';
import './Login.css';

const { Title, Text, Link } = Typography;

type Mode = 'login' | 'register' | 'forgot';

const Login: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const { login, register } = useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const switchMode = (newMode: Mode) => {
    form.resetFields();
    setMode(newMode);
  };

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const success = await login(values.username, values.password);
      if (success) {
        message.success('登录成功！');
        navigate('/home');
      } else {
        message.error('用户名或密码错误，请重试。');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: {
    username: string;
    email: string;
    password: string;
    confirm: string;
  }) => {
    setLoading(true);
    try {
      const success = await register(values.username, values.email, values.password);
      if (success) {
        message.success('注册成功！');
        navigate('/home');
      } else {
        message.error('注册失败，用户名或邮箱已存在。');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (values: { email: string }) => {
    setLoading(true);
    try {
      console.log('Forgot password for:', values.email);
      message.success('重置邮件已发送，请检查您的邮箱。');
      switchMode('login');
    } finally {
      setLoading(false);
    }
  };

  const renderTitle = () => {
    switch (mode) {
      case 'login': return 'Welcome Back';
      case 'register': return 'Create Account';
      case 'forgot': return 'Reset Password';
    }
  };

  const renderSubtitle = () => {
    switch (mode) {
      case 'login': return 'Sign in to continue to Plan Maniac';
      case 'register': return 'Join Plan Maniac today';
      case 'forgot': return 'Enter your email to reset password';
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <img src={logoImg} alt="Logo" className="login-logo-img" />
          <span className="logo-text">Plan Maniac</span>
        </div>

        {/* Title */}
        <Title level={3} className="login-title">
          {renderTitle()}
        </Title>
        <Text className="login-subtitle">{renderSubtitle()}</Text>

        {/* Login Form */}
        {mode === 'login' && (
          <Form
            form={form}
            name="login"
            className="login-form"
            onFinish={handleLogin}
            autoComplete="off"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Please enter your username' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="Username" size="large" />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
            </Form.Item>

            <Form.Item>
              <div className="login-form-options">
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox>Remember me</Checkbox>
                </Form.Item>
                <Link onClick={() => switchMode('forgot')}>Forgot password?</Link>
              </div>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" className="login-submit-btn" loading={loading} block size="large">
                Sign In
              </Button>
            </Form.Item>

            <div className="login-form-footer">
              <Text>Don't have an account? </Text>
              <Link onClick={() => switchMode('register')}>Sign up now</Link>
            </div>
          </Form>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <Form
            form={form}
            name="register"
            className="login-form"
            onFinish={handleRegister}
            autoComplete="off"
          >
            <Form.Item name="username" rules={[{ required: true, message: 'Please enter your username' }]}>
              <Input prefix={<UserOutlined />} placeholder="Username" size="large" />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Please enter your password' },
                { min: 6, message: 'Password must be at least 6 characters' },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
            </Form.Item>

            <Form.Item
              name="confirm"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm your password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Confirm Password" size="large" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" className="login-submit-btn" loading={loading} block size="large">
                Sign Up
              </Button>
            </Form.Item>

            <div className="login-form-footer">
              <Text>Already have an account? </Text>
              <Link onClick={() => switchMode('login')}>Sign in</Link>
            </div>
          </Form>
        )}

        {/* Forgot Password Form */}
        {mode === 'forgot' && (
          <Form
            form={form}
            name="forgot"
            className="login-form"
            onFinish={handleForgot}
            autoComplete="off"
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" className="login-submit-btn" loading={loading} block size="large">
                Send Reset Email
              </Button>
            </Form.Item>

            <div className="login-form-footer">
              <Link onClick={() => switchMode('login')}>Back to Sign In</Link>
            </div>
          </Form>
        )}
      </div>
    </div>
  );
};

export default Login;
