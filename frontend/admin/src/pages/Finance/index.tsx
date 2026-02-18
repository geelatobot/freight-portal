import { useRef } from 'react'
import { PageContainer } from '@ant-design/pro-components'
import ProTable from '@ant-design/pro-table'
import type { ActionType, ProColumns } from '@ant-design/pro-table'
import { Button, Space, Tag, Modal, message } from 'antd'
import { CheckCircleOutlined } from '@ant-design/icons'
import { financeApi } from '@/services'
import dayjs from 'dayjs'

interface Bill {
  id: string
  billNo: string
  billType: 'FREIGHT' | 'AGENCY' | 'CUSTOMS' | 'INSURANCE' | 'OTHER'
  status: 'DRAFT' | 'ISSUED' | 'PARTIAL_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  amount: number
  currency: string
  paidAmount?: number
  issueDate?: string
  dueDate?: string
  paidDate?: string
  remark?: string
  createdAt: string
  company?: {
    id: string
    companyName: string
  }
  order?: {
    id: string
    orderNo: string
  }
}

const typeMap = {
  FREIGHT: '运费',
  AGENCY: '代理费',
  CUSTOMS: '报关费',
  INSURANCE: '保险费',
  OTHER: '其他',
}

const statusMap = {
  DRAFT: { text: '草稿', color: 'default' },
  ISSUED: { text: '已开具', color: 'blue' },
  PARTIAL_PAID: { text: '部分支付', color: 'orange' },
  PAID: { text: '已支付', color: 'green' },
  OVERDUE: { text: '逾期', color: 'red' },
  CANCELLED: { text: '已取消', color: 'default' },
}

export default function FinanceList() {
  const actionRef = useRef<ActionType>()

  const columns: ProColumns<Bill>[] = [
    {
      title: '账单号',
      dataIndex: 'billNo',
      width: 150,
      fixed: 'left',
    },
    {
      title: '企业',
      dataIndex: ['company', 'companyName'],
      width: 150,
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'billType',
      width: 100,
      valueEnum: {
        FREIGHT: { text: '运费' },
        AGENCY: { text: '代理费' },
        CUSTOMS: { text: '报关费' },
        INSURANCE: { text: '保险费' },
        OTHER: { text: '其他' },
      },
      render: (_, record) => typeMap[record.billType],
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 120,
      render: (_, record) => `¥${record.amount.toLocaleString()}`,
    },
    {
      title: '已付金额',
      dataIndex: 'paidAmount',
      width: 120,
      render: (_, record) =>
        record.paidAmount ? `¥${record.paidAmount.toLocaleString()}` : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueEnum: {
        DRAFT: { text: '草稿', status: 'Default' },
        ISSUED: { text: '已开具', status: 'Processing' },
        PARTIAL_PAID: { text: '部分支付', status: 'Warning' },
        PAID: { text: '已支付', status: 'Success' },
        OVERDUE: { text: '逾期', status: 'Error' },
        CANCELLED: { text: '已取消', status: 'Default' },
      },
      render: (_, record) => (
        <Tag color={statusMap[record.status].color}>{statusMap[record.status].text}</Tag>
      ),
    },
    {
      title: '到期日',
      dataIndex: 'dueDate',
      width: 120,
      render: (text) => (text ? dayjs(text as string).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
      hideInSearch: true,
      render: (text) => dayjs(text as string).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {(record.status === 'ISSUED' || record.status === 'PARTIAL_PAID' || record.status === 'OVERDUE') && (
            <Button
              type="link"
              icon={<CheckCircleOutlined />}
              onClick={() => handleConfirmPayment(record)}
            >
              确认收款
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const handleConfirmPayment = (record: Bill) => {
    const remaining = record.amount - (record.paidAmount || 0)
    
    Modal.confirm({
      title: '确认收款',
      content: (
        <div>
          <p>账单号：{record.billNo}</p>
          <p>企业：{record.company?.companyName}</p>
          <p>总金额：¥{record.amount.toLocaleString()}</p>
          <p>已付金额：¥{(record.paidAmount || 0).toLocaleString()}</p>
          <p>待付金额：¥{remaining.toLocaleString()}</p>
        </div>
      ),
      onOk: async () => {
        try {
          await financeApi.confirmPayment(record.id, remaining)
          message.success('收款确认成功')
          actionRef.current?.reload()
        } catch (error) {
          message.error('操作失败')
        }
      },
    })
  }

  return (
    <PageContainer title="财务管理">
      <ProTable<Bill>
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
        }}
        columns={columns}
        request={async (params) => {
          const response = await financeApi.getBills({
            page: params.current,
            pageSize: params.pageSize,
            status: params.status,
            type: params.billType,
            keyword: params.billNo,
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
    </PageContainer>
  )
}
