import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { message } from 'antd'
import api from '@/services/api'

interface User {
  id: string
  username: string
  email?: string
  phone?: string
  realName?: string
  avatar?: string
  status: string
  role?: string
}

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 检查本地存储的token
    const token = localStorage.getItem('admin_token')
    if (token) {
      fetchUserInfo()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUserInfo = async () => {
    try {
      const response = await api.get('/auth/me')
      setUser(response.data)
    } catch (error) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_refresh_token')
    } finally {
      setLoading(false)
    }
  }

  const login = async (username: string, password: string) => {
    try {
      const response = await api.post('/auth/login', {
        username,
        password,
      })
      
      const { accessToken, refreshToken, user } = response.data
      
      localStorage.setItem('admin_token', accessToken)
      localStorage.setItem('admin_refresh_token', refreshToken)
      
      setUser(user)
      message.success('登录成功')
    } catch (error: any) {
      message.error(error.response?.data?.message || '登录失败')
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_refresh_token')
    setUser(null)
    message.success('已退出登录')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
