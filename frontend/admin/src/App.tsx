import { ProLayout } from '@ant-design/pro-layout'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  DashboardOutlined,
  TeamOutlined,
  ShoppingCartOutlined,
  ContainerOutlined,
  DollarOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import type { MenuDataItem } from '@ant-design/pro-layout'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import AppRoutes from './routes'

const menuData: MenuDataItem[] = [
  {
    path: '/',
    name: '仪表盘',
    icon: <DashboardOutlined />,
  },
  {
    path: '/companies',
    name: '企业管理',
    icon: <TeamOutlined />,
  },
  {
    path: '/orders',
    name: '订单管理',
    icon: <ShoppingCartOutlined />,
  },
  {
    path: '/shipments',
    name: '货物管理',
    icon: <ContainerOutlined />,
  },
  {
    path: '/finance',
    name: '财务管理',
    icon: <DollarOutlined />,
  },
  {
    path: '/settings',
    name: '系统设置',
    icon: <SettingOutlined />,
  },
]

function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  if (!user) {
    return <Login />
  }

  return (
    <ProLayout
      title="货运门户管理后台"
      logo="https://gw.alipayobjects.com/zos/rmsportal/KDpgvguMpGfqaHPjicRK.svg"
      location={{
        pathname: location.pathname,
      }}
      menuDataRender={() => menuData}
      menuItemRender={(item, dom) => (
        <a
          onClick={() => {
            navigate(item.path || '/')
          }}
        >
          {dom}
        </a>
      )}
      avatarProps={{
        src: user.avatar || 'https://gw.alipayobjects.com/zos/antfincdn/efFD%24IOql2/weixintupian_20170331104822.jpg',
        title: user.realName || user.username,
        render: (_, dom) => (
          <div onClick={logout}>{dom}</div>
        ),
      }}
    >
      <AppRoutes />
    </ProLayout>
  )
}

function App() {
  return (
    <AuthProvider>
      <Layout />
    </AuthProvider>
  )
}

export default App
