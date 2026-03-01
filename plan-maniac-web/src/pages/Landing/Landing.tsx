import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import './Landing.css';

/* ========== Data ========== */
const features = [
  {
    icon: '🤖',
    title: 'AI 智能规划',
    text: '与 Pico 对话，描述你的目标，AI 会为你自动生成科学合理的分步计划，覆盖学习、健身、工作等 16 大类场景。',
  },
  {
    icon: '📅',
    title: '日历计划管理',
    text: '直观的月历视图一目了然，每日计划支持拖拽排序和颜色标记，轻松掌控你的时间安排。',
  },
  {
    icon: '🏆',
    title: '积分激励体系',
    text: '完成每日计划即可获得积分奖励，解锁成就和专属权益，让坚持变成一种习惯。',
  },
];

/* ========== Navbar ========== */
const Navbar: React.FC = () => {
  const [solid, setSolid] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className={`landing-nav ${solid ? 'solid' : 'transparent'}`}>
      <div className="landing-nav-logo">
        <span className="landing-nav-logo-icon">📋</span>
        <span className="landing-nav-logo-text">Plan Maniac</span>
      </div>

      <div className="landing-nav-links">
        <button className="landing-nav-link" onClick={scrollToFeatures}>
          功能介绍
        </button>
        <button
          className="landing-nav-link"
          onClick={() =>
            document.getElementById('footer')?.scrollIntoView({ behavior: 'smooth' })
          }
        >
          关于我们
        </button>
        <button className="landing-nav-cta" onClick={() => navigate('/login')}>
          开始使用
        </button>
      </div>

      {/* Mobile: only show CTA */}
      <button
        className="landing-nav-cta-mobile"
        onClick={() => navigate('/login')}
      >
        开始使用
      </button>
    </nav>
  );
};

/* ========== Hero Section ========== */
const HeroSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="landing-hero">
      {/* Decorative blobs */}
      <motion.div
        className="landing-hero-blob landing-hero-blob-1"
        animate={{ y: [0, -25, 0] }}
        transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}
      />
      <motion.div
        className="landing-hero-blob landing-hero-blob-2"
        animate={{ y: [0, 20, 0] }}
        transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
      />
      <motion.div
        className="landing-hero-blob landing-hero-blob-3"
        animate={{ y: [0, -15, 0], x: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
      />

      <div className="landing-hero-content">
        <motion.h1
          className="landing-hero-title"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
        >
          让 AI 助手 Pico
          <br />
          帮你规划每一天
        </motion.h1>

        <motion.p
          className="landing-hero-subtitle"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
        >
          Plan Maniac 是你的智能计划管理伙伴，通过 AI
          对话生成个性化日程，用游戏化积分激励你达成每一个目标。
        </motion.p>

        <motion.button
          className="landing-hero-btn"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6, ease: 'easeOut' }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/login')}
        >
          免费开始使用
          <span className="landing-hero-btn-arrow">→</span>
        </motion.button>
      </div>
    </section>
  );
};

/* ========== Features Section ========== */
const FeaturesSection: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.2 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' as const },
    },
  };

  return (
    <section id="features" className="landing-features" ref={ref}>
      <motion.div
        className="landing-features-header"
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <h2 className="landing-features-title">核心功能</h2>
        <p className="landing-features-desc">
          三大核心能力，让计划管理变得简单而有趣
        </p>
      </motion.div>

      <motion.div
        className="landing-features-grid"
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
      >
        {features.map((f) => (
          <motion.div
            key={f.title}
            className="landing-feature-card"
            variants={itemVariants}
          >
            <span className="landing-feature-icon">{f.icon}</span>
            <h3 className="landing-feature-title">{f.title}</h3>
            <p className="landing-feature-text">{f.text}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
};

/* ========== CTA Section ========== */
const CTASection: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const navigate = useNavigate();

  return (
    <section className="landing-cta" ref={ref}>
      <div className="landing-cta-content">
        <motion.h2
          className="landing-cta-title"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          准备好开始你的高效生活了吗？
        </motion.h2>

        <motion.p
          className="landing-cta-subtitle"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
        >
          加入 Plan Maniac，让每一天都充满计划感。
        </motion.p>

        <motion.button
          className="landing-cta-btn"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/login')}
        >
          立即体验
          <span>→</span>
        </motion.button>
      </div>
    </section>
  );
};

/* ========== Footer ========== */
const LandingFooter: React.FC = () => (
  <footer id="footer" className="landing-footer">
    <div className="landing-footer-logo">
      <span className="landing-footer-logo-icon">📋</span>
      <span className="landing-footer-logo-text">Plan Maniac</span>
    </div>
    <div className="landing-footer-links">
      <button className="landing-footer-link">隐私政策</button>
      <span className="landing-footer-divider">|</span>
      <button className="landing-footer-link">使用条款</button>
      <span className="landing-footer-divider">|</span>
      <button className="landing-footer-link">联系我们</button>
    </div>
    <p className="landing-footer-tagline">让每一天都值得被认真规划</p>
    <p className="landing-footer-copyright">
      &copy; 2026 Plan Maniac. All rights reserved.
    </p>
  </footer>
);

/* ========== Main Landing Component ========== */
const Landing: React.FC = () => {
  return (
    <div className="landing-page">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
};

export default Landing;
