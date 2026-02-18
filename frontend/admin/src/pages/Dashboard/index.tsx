import { useEffect, useState } from 'react'
import { PageContainer, StatisticCard } from '@ant-design/pro-components'
import { Row, Col, Card } from 'antd'
import {
  TeamOutlined,
  ShoppingCartOutlined,
  ContainerOutlined,
  DollarOutlined,
} from '@ant-design/icons'
import { dashboardApi } from '@/services'

interface DashboardStats {
  overview: {
    totalCompanies: number
    totalOrders: number
    totalShipments: number
    totalBills: number
    pendingOrders: number
    pendingBills: number
  }
  monthly: {
    orders: number
    revenue: number
  }
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await dashboardApi.getStats()
      setStats(response.data)
    } catch (error) {
      console.error('获取统计数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageContainer title="仪表盘" loading={loading}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatisticCard
            statistic={{
              title: '企业总数',
              value: stats?.overview.totalCompanies || 0,
              icon: <TeamOutlined />,
            }}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatisticCard
            statistic={{
              title: '订单总数',
              value: stats?.overview.totalOrders || 0,
              icon: <ShoppingCartOutlined />,
            }}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatisticCard
            statistic={{
              title: '货物总数',
              value: stats?.overview.totalShipments || 0,
              icon: <ContainerOutlined />,
            }}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatisticCard
            statistic={{
              title: '账单总数',
              value: stats?.overview.totalBills || 0,
              icon: <DollarOutlined />,
            }}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="本月统计" style={{ minHeight: 200 }}>
            <Row gutter={16}>
              <Col span={12}>
                <StatisticCard
                  statistic={{
                    title: '本月订单',
                    value: stats?.monthly.orders || 0,
                  }}
                />
              </Col>
              <Col span={12}>
                <StatisticCard
                  statistic={{
                    title: '本月营收',
                    value: stats?.monthly.revenue || 0,
                    prefix: '¥',
                    precision: 2,
                  }}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="待处理事项" style={{ minHeight: 200 }}>
            <Row gutter={16}>
              <Col span={12}>
                <StatisticCard
                  statistic={{
                    title: '待处理订单',
                    value: stats?.overview.pendingOrders || 0,
                    status: 'warning',
                  }}
                />
              </Col>
              <Col span={12}>
                <StatisticCard
                  statistic={{
                    title: '待收款账单',
                    value: stats?.overview.pendingBills || 0,
                    status: 'error',
                  }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </PageContainer>
  )
}
