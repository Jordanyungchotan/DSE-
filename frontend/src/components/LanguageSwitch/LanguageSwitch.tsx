import { Dropdown, Button } from 'antd'
import { GlobalOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useLanguageStore } from '../../stores/languageStore'
import type { Locale } from '../../i18n'
import styles from './LanguageSwitch.module.css'

const languageLabels: Record<Locale, string> = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  'en': 'English',
}

const languageFlags: Record<Locale, string> = {
  'zh-CN': '🇨🇳',
  'zh-TW': '🇭🇰',
  'en': '🇬🇧',
}

const LanguageSwitch = () => {
  const { locale, setLocale } = useLanguageStore()

  const menuItems: MenuProps['items'] = [
    {
      key: 'zh-TW',
      label: (
        <span className={styles.menuItem}>
          <span className={styles.flag}>{languageFlags['zh-TW']}</span>
          <span>繁體中文</span>
        </span>
      ),
    },
    {
      key: 'zh-CN',
      label: (
        <span className={styles.menuItem}>
          <span className={styles.flag}>{languageFlags['zh-CN']}</span>
          <span>简体中文</span>
        </span>
      ),
    },
    {
      key: 'en',
      label: (
        <span className={styles.menuItem}>
          <span className={styles.flag}>{languageFlags['en']}</span>
          <span>English</span>
        </span>
      ),
    },
  ]

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    setLocale(key as Locale)
  }

  return (
    <Dropdown
      menu={{ 
        items: menuItems, 
        onClick: handleMenuClick,
        selectedKeys: [locale],
      }}
      trigger={['click']}
      placement="bottomRight"
    >
      <Button 
        type="text" 
        className={styles.switchButton}
        icon={<GlobalOutlined />}
      >
        <span className={styles.currentLang}>
          <span className={styles.flag}>{languageFlags[locale]}</span>
          <span className={styles.langText}>{languageLabels[locale]}</span>
        </span>
      </Button>
    </Dropdown>
  )
}

export default LanguageSwitch

