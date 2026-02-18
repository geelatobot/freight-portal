import { PageContainer } from '@ant-design/pro-components'
import { Card, Descriptions, Tag, Space } from 'antd'

export default function Settings() {
  return (
    <PageContainer title="系统设置">
      <Card title="系统信息">
        <Descriptions bordered column={2}>
          <Descriptions.Item label="系统名称">货运门户管理后台</Descriptions.Item>
          <Descriptions.Item label="版本号">v1.0.0</Descriptions.Item>
          <Descriptions.Item label="技术栈">React + Ant Design Pro + Vite</Descriptions.Item>
          <Descriptions.Item label="开发团队">货运门户开发团队</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="功能模块" style={{ marginTop: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Tag color="green">已完成</Tag> 仪表盘 - 数据统计与概览
          </div>
          <div>
            <Tag color="green">已完成</Tag> 企业管理 - 企业审核、信用额度管理
          </div>
          <div>
            <Tag color="green">已完成</Tag> 订单管理 - 订单列表、状态修改、导出
          </div>
          <div>
            <Tag color="green">已完成</Tag> 货物管理 - 集装箱列表、节点追踪
          </div>
          <div>
            <Tag color="green">已完成</Tag> 财务管理 - 账单管理、收款确认
          </div>
        </Space>
      </Card>
    </PageContainer>
  )
}
