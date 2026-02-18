import { useRef, useState } from 'react'
import { PageContainer } from '@ant-design/pro-components'
import ProTable from '@ant-design/pro-table'
import type { ActionType, ProColumns } from '@ant-design/pro-table'
import { Button, Space, Tag, Modal, message, InputNumber, Form, Input } from 'antd'
import { EyeOutlined, CheckCircleOutlined, CloseCircleOutlined, DollarOutlined } from '@ant-design/icons'
import { companyApi } from '@/services'
import dayjs from 'dayjs'

interface Company {
  id: string
  companyName: string
  creditCode?: string
  address?: string
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  creditLimit?: number
  creditUsed: number
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED'
  remark?: string
  createdAt: string
  _count?: {
    orders: number
    bills: number
  }
}

const statusMap = {
  PENDING: { text: '待审核', color: 'orange' },
  ACTIVE: { text: '正常', color: 'green' },
  SUSPENDED: { text: '暂停', color: 'red' },
  REJECTED: { text: '拒绝', color: 'default' },
}

export default function CompanyList() {
  const actionRef = useRef<ActionType>()
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [creditModalVisible, setCreditModalVisible] = useState(false)
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null)
  const [form] = Form.useForm()

  const columns: ProColumns<Company>[] = [
    {
      title: '企业名称',
      dataIndex: 'companyName',
      ellipsis: true,
      width: 200,
    },
    {
      title: '统一社会信用代码',
      dataIndex: 'creditCode',
      ellipsis: true,
      width: 180,
      hideInSearch: true,
    },
    {
      title: '联系人',
      dataIndex: 'contactName',
      width: 100,
      hideInSearch: true,
    },
    {
      title: '联系电话',
      dataIndex: 'contactPhone',
      width: 130,
      hideInSearch: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueEnum: {
        PENDING: { text: '待审核', status: 'Warning' },
        ACTIVE: { text: '正常', status: 'Success' },
        SUSPENDED: { text: '暂停', status: 'Error' },
        REJECTED: { text: '拒绝', status: 'Default' },
      },
      render: (_, record) => (
        <Tag color={statusMap[record.status].color}>{statusMap[record.status].text}</Tag>
      ),
    },
    {
      title: '信用额度',
      dataIndex: 'creditLimit',
      width: 150,
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          <span>¥{(record.creditLimit || 0).toLocaleString()}</span>
          <span style={{ color: '#999' }}>(已用: ¥{record.creditUsed.toLocaleString()})</span>
        </Space>
      ),
    },
    {
      title: '订单数',
      dataIndex: ['_count', 'orders'],
      width: 80,
      hideInSearch: true,
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      width: 180,
      hideInSearch: true,
      render: (text) => dayjs(text as string).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {record.status === 'PENDING' && (
            <>
              <Button
                type="link"
                icon={<CheckCircleOutlined />}
                style={{ color: '#52c41a' }}
                onClick={() => handleApprove(record)}
              >
                通过
              </Button>
              <Button
                type="link"
                icon={<CloseCircleOutlined />}
                danger
                onClick={() => handleReject(record)}
              >
                拒绝
              </Button>
            </>
          )}
          <Button
            type="link"
            icon={<DollarOutlined />}
            onClick={() => handleSetCredit(record)}
          >
            额度
          </Button>
        </Space>
      ),
    },
  ]

  const handleViewDetail = (record: Company) => {
    setCurrentCompany(record)
    setDetailModalVisible(true)
  }

  const handleApprove = async (record: Company) => {
    Modal.confirm({
      title: '确认通过',
      content: `确定要通过 "${record.companyName}" 的审核吗？`,
      onOk: async () => {
        try {
          await companyApi.updateStatus(record.id, 'ACTIVE')
          message.success('审核通过')
          actionRef.current?.reload()
        } catch (error) {
          message.error('操作失败')
        }
      },
    })
  }

  const handleReject = async (record: Company) => {
    Modal.confirm({
      title: '确认拒绝',
      content: `确定要拒绝 "${record.companyName}" 的审核吗？`,
      onOk: async () => {
        try {
          await companyApi.updateStatus(record.id, 'REJECTED')
          message.success('已拒绝')
          actionRef.current?.reload()
        } catch (error) {
          message.error('操作失败')
        }
      },
    })
  }

  const handleSetCredit = (record: Company) => {
    setCurrentCompany(record)
    form.setFieldsValue({ creditLimit: record.creditLimit })
    setCreditModalVisible(true)
  }

  const handleCreditSubmit = async (values: any) => {
    if (!currentCompany) return
    try {
      await companyApi.updateCredit(currentCompany.id, values.creditLimit)
      message.success('信用额度设置成功')
      setCreditModalVisible(false)
      actionRef.current?.reload()
    } catch (error) {
      message.error('设置失败')
    }
  }

  return (
    <PageContainer title="企业管理">
      <ProTable<Company>
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
        }}
        columns={columns}
        request={async (params) => {
          const response = await companyApi.getList({
            page: params.current,
            pageSize: params.pageSize,
            status: params.status,
            keyword: params.companyName,
          })
          return {
            data: response.data.list,
            success: true,
            total: response.data.pagination.total,
          }
        }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        scroll={{ x: 1200 }}
      />

      {/* 详情弹窗 */}
      <Modal
        title="企业详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={700}
      >
        {currentCompany && (
          <Form layout="vertical">
            <Form.Item label="企业名称">
              <Input value={currentCompany.companyName} disabled />
            </Form.Item>
            <Form.Item label="统一社会信用代码">
              <Input value={currentCompany.creditCode} disabled />
            </Form.Item>
            <Form.Item label="企业地址">
              <Input.TextArea value={currentCompany.address} disabled rows={2} />
            </Form.Item>
            <Form.Item label="联系人">
              <Input value={currentCompany.contactName} disabled />
            </Form.Item>
            <Form.Item label="联系电话">
              <Input value={currentCompany.contactPhone} disabled />
            </Form.Item>
            <Form.Item label="联系邮箱">
              <Input value={currentCompany.contactEmail} disabled />
            </Form.Item>
            <Form.Item label="状态">
              <Tag color={statusMap[currentCompany.status].color}>
                {statusMap[currentCompany.status].text}
              </Tag>
            </Form.Item>
            <Form.Item label="信用额度">
              <Input value={`¥${(currentCompany.creditLimit || 0).toLocaleString()}`} disabled />
            </Form.Item>
            <Form.Item label="已用额度">
              <Input value={`¥${currentCompany.creditUsed.toLocaleString()}`} disabled />
            </Form.Item>
            <Form.Item label="注册时间">
              <Input value={dayjs(currentCompany.createdAt).format('YYYY-MM-DD HH:mm')} disabled />
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* 信用额度弹窗 */}
      <Modal
        title="设置信用额度"
        open={creditModalVisible}
        onCancel={() => setCreditModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} onFinish={handleCreditSubmit} layout="vertical">
          <Form.Item
            name="creditLimit"
            label="信用额度"
            rules={[{ required: true, message: '请输入信用额度' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="¥"
              placeholder="请输入信用额度"
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
