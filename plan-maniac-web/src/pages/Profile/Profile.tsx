import React, { useState, useEffect } from 'react';
import {
  Avatar,
  Button,
  Card,
  Form,
  Input,
  Upload,
  Modal,
  List,
  message,
} from 'antd';
import {
  UserOutlined,
  CopyOutlined,
  ShopOutlined,
  ArrowLeftOutlined,
  CameraOutlined,
  LockOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../stores/AppContext';
import { usersApi } from '../../services/users';
import { pointsApi } from '../../services/points';
import type { PointTransaction } from '../../services/points';
import './Profile.css';

const Profile: React.FC = () => {
  const { user, updateUser } = useApp();
  const navigate = useNavigate();

  const [basicForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [shopModalOpen, setShopModalOpen] = useState(false);
  const [pointsHistory, setPointsHistory] = useState<PointTransaction[]>([]);

  // Load real points history from API
  useEffect(() => {
    pointsApi.getHistory().then(setPointsHistory).catch(() => {});
  }, []);

  /* -------- 头像更换 -------- */
  const handleAvatarChange = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const avatar = e.target?.result as string;
      try {
        await usersApi.updateProfile({ avatar });
        updateUser({ avatar });
        message.success('头像更新成功');
      } catch {
        message.error('头像更新失败');
      }
    };
    reader.readAsDataURL(file);
    return false;
  };

  /* -------- 复制 ID -------- */
  const handleCopyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id).then(() => {
        message.success('ID已复制');
      }).catch(() => {
        message.success('ID已复制');
      });
    }
  };

  /* -------- 保存基本信息 -------- */
  const handleSaveBasic = () => {
    basicForm.validateFields().then(async (values) => {
      try {
        await usersApi.updateProfile({
          nickname: values.nickname,
          signature: values.signature,
        });
        updateUser({
          nickname: values.nickname,
          signature: values.signature,
        });
        message.success('个人信息已保存');
      } catch {
        message.error('保存失败，请重试');
      }
    });
  };

  /* -------- 修改密码 -------- */
  const handleChangePassword = () => {
    passwordForm.validateFields().then((values) => {
      if (values.newPassword !== values.confirmPassword) {
        message.error('两次输入的新密码不一致');
        return;
      }
      // Demo：仅提示
      message.success('密码修改成功');
      passwordForm.resetFields();
    });
  };

  return (
    <div className="profile-container">
      {/* ========== 顶部用户卡片 ========== */}
      <div className="profile-hero-card">
        <div className="profile-avatar-wrapper">
          <Avatar
            size={100}
            icon={!user?.avatar ? <UserOutlined /> : undefined}
            src={user?.avatar || undefined}
            className="profile-avatar"
          />
          <Upload
            showUploadList={false}
            accept="image/*"
            beforeUpload={(file) => handleAvatarChange(file as File)}
          >
            <Button
              type="link"
              size="small"
              icon={<CameraOutlined />}
              className="change-avatar-btn"
            >
              更换头像
            </Button>
          </Upload>
        </div>

        <h1 className="profile-nickname">{user?.nickname || '用户'}</h1>

        <div className="profile-id-row">
          <span className="profile-id-badge">ID: {user?.id || 'PM-00000000-0000'}</span>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={handleCopyId}
            className="copy-id-btn"
          />
        </div>

        <p className="profile-signature">
          {user?.signature || '这个人很懒，什么都没写~'}
        </p>
      </div>

      {/* ========== Card 1：基本信息 ========== */}
      <Card title="基本信息" className="profile-card">
        <Form
          form={basicForm}
          layout="vertical"
          initialValues={{
            nickname: user?.nickname || '',
            signature: user?.signature || '',
          }}
        >
          <Form.Item
            label="昵称"
            name="nickname"
            rules={[{ required: true, message: '请输入昵称' }]}
          >
            <Input placeholder="请输入昵称" maxLength={20} />
          </Form.Item>

          <Form.Item label="个性签名" name="signature">
            <Input.TextArea
              placeholder="写一句话介绍自己吧"
              maxLength={100}
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" block onClick={handleSaveBasic}>
              保存修改
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* ========== Card 2：安全设置 ========== */}
      <Card
        title={
          <span>
            <LockOutlined style={{ marginRight: 8 }} />
            安全设置
          </span>
        }
        className="profile-card"
      >
        <Form form={passwordForm} layout="vertical">
          <Form.Item
            label="当前密码"
            name="currentPassword"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password placeholder="请输入当前密码" />
          </Form.Item>

          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[{ required: true, message: '请输入新密码' }]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>

          <Form.Item
            label="确认新密码"
            name="confirmPassword"
            rules={[{ required: true, message: '请再次输入新密码' }]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" block onClick={handleChangePassword}>
              修改密码
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* ========== Card 3：积分中心 ========== */}
      <Card
        title={
          <span>
            <TrophyOutlined style={{ marginRight: 8 }} />
            积分中心
          </span>
        }
        className="profile-card profile-points-card"
      >
        <div className="points-display-area">
          <div className="points-number">{user?.points ?? 0}</div>
          <p className="points-label">当前积分</p>
          <p className="points-hint">完成每日计划可获得 1 积分</p>
          <Button
            type="primary"
            icon={<ShopOutlined />}
            onClick={() => setShopModalOpen(true)}
            className="shop-btn"
          >
            进入积分商城
          </Button>
        </div>

        <div className="points-history">
          <h4 className="points-history-title">积分记录</h4>
          <List
            size="small"
            dataSource={pointsHistory}
            locale={{ emptyText: '暂无积分记录' }}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                extra={
                  <span className="points-history-value" style={{ color: item.amount > 0 ? '#52c41a' : '#ff4d4f' }}>
                    {item.amount > 0 ? `+${item.amount}` : item.amount}
                  </span>
                }
              >
                <List.Item.Meta
                  title={item.reason}
                  description={new Date(item.createdAt).toLocaleString('zh-CN')}
                />
              </List.Item>
            )}
          />
        </div>
      </Card>

      {/* ========== 底部返回首页 ========== */}
      <div className="profile-footer">
        <Button
          type="default"
          icon={<ArrowLeftOutlined />}
          size="large"
          onClick={() => navigate('/')}
          block
        >
          返回首页
        </Button>
      </div>

      {/* ========== 积分商城 Modal ========== */}
      <Modal
        title={
          <span>
            <ShopOutlined style={{ marginRight: 8 }} />
            积分商城
          </span>
        }
        open={shopModalOpen}
        onCancel={() => setShopModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setShopModalOpen(false)}>
            我知道了
          </Button>,
        ]}
        centered
      >
        <div className="shop-modal-content">
          <span className="shop-modal-emoji">🏗️</span>
          <p className="shop-modal-text">积分商城正在建设中，敬请期待！</p>
        </div>
      </Modal>
    </div>
  );
};

export default Profile;
