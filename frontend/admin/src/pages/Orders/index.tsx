import { useRef, useState } from 'react'
import { PageContainer } from '@ant-design/pro-components'
import ProTable from '@ant-design/pro-table'
import type { ActionType, ProColumns } from '@ant-design/pro-table'
import { Button, Space, Tag, Modal, message, Form, Select, Input, Descriptions } from 'antd'
import { EyeOutlined, EditOutlined, ExportOutlined } from '@ant-design/icons'
import { orderApi } from '@/services'
import dayjs from 'dayjs'

interface Order {
  id: string
  orderNo: string
  type: 'FCL' | 'LCL' | 'AIR' | 'LAND' | 'MULTIMODAL'
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'REJECTED'
  originPort: string
  destinationPort: string
  cargoDesc: string
  cargoWeight?: number
  cargoVolume?: number
  containerType?: string
  containerCount?: number
  etd?: string
  eta?: string
  totalAmount?: number
  currency: string
  remark?: string
  internalRemark?: string
  createdAt: string
  company?: {
    id: string
    companyName: string
  }
  creator?: {
    id: string
    username: string
    realName?: string
  }
  shipments?: Array<{
    id: string
    containerNo: string
    status: string
  }>
}

const typeMap = {
  FCL: '整箱',
  LCL: '拼箱',
  AIR: '空运',
  LAND: '陆运',
  MULTIMODAL: '多式联运',
}

const statusMap = {
  PENDING: { text: '待确认', color: 'orange' },
  CONFIRMED: { text: '已确认', color: 'blue' },
  PROCESSING: { text: '执行中', color: 'processing' },
  COMPLETED: { text: '已完成', color: 'green' },
  CANCELLED: { text: '已取消', color: 'default' },
  REJECTED: { text: '已拒绝', color: 'red' },
}

export default function OrderList() {
  const actionRef = useRef<ActionType>()
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [statusModalVisible, setStatusModalVisible] = useState(false)
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null)
  const [form] = Form.useForm()

  const columns: ProColumns<Order>[] = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
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
      dataIndex: 'type',
      width: 100,
      valueEnum: {
        FCL: { text: '整箱' },
        LCL: { text: '拼箱' },
        AIR: { text: '空运' },
        LAND: { text: '陆运' },
        MULTIMODAL: { text: '多式联运' },
      },
      render: (_, record) => typeMap[record.type],
    },
    {
      title: '起运港',
      dataIndex: 'originPort',
      width: 120,
    },
    {
      title: '目的港',
      dataIndex: 'destinationPort',
      width: 120,
    },
    {
      title: '货物描述',
      dataIndex: 'cargoDesc',
      width: 200,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueEnum: {
        PENDING: { text: '待确认', status: 'Warning' },
        CONFIRMED: { text: '已确认', status: 'Processing' },
        PROCESSING: { text: '执行中', status: 'Processing' },
        COMPLETED: { text: '已完成', status: 'Success' },
        CANCELLED: { text: '已取消', status: 'Default' },
        REJECTED: { text: '已拒绝', status: 'Error' },
      },
      render: (_, record) => (
        <Tag color={statusMap[record.status].color}>{statusMap[record.status].text}</Tag>
      ),
    },
    {
      title: '金额',
      dataIndex: 'totalAmount',
      width: 120,
      hideInSearch: true,
      render: (_, record) =>
        record.totalAmount ? `¥${record.totalAmount.toLocaleString()}` : '-',
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
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleUpdateStatus(record)}
          >
            修改状态
          </Button>
        </Space>
      ),
    },
  ]

  const handleViewDetail = async (record: Order) => {
    try {
      const response = await orderApi.getDetail(record.id)
      setCurrentOrder(response.data)
      setDetailModalVisible(true)
    } catch (error) {
      message.error('获取订单详情失败')
    }
  }

  const handleUpdateStatus = (record: Order) => {
    setCurrentOrder(record)
    form.setFieldsValue({ status: record.status, remark: '' })
    setStatusModalVisible(true)
  }

  const handleStatusSubmit = async (values: any) => {
    if (!currentOrder) return
    try {
      await orderApi.updateStatus(currentOrder.id, values.status, values.remark)
      message.success('状态修改成功')
      setStatusModalVisible(false)
      actionRef.current?.reload()
    } catch (error) {
      message.error('修改失败')
    }
  }

  const handleExport = async () => {
    try {
      const response = await orderApi.exportOrders({})
      const blob = new Blob([response.data], { type: 'application/vnd.ms-excel' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `orders_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`
      link.click()
      message.success('导出成功')
    } catch (error) {
      message.error('导出失败')
    }
  }

  return (
    <PageContainer
      title="订单管理"
      extra={[
        <Button key="export" icon={<ExportOutlined />} onClick={handleExport}>
          导出订单
        </Button>,
      ]}
    >
      <ProTable<Order>
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
        }}
        columns={columns}
        request={async (params) => {
          const response = await orderApi.getList({
            page: params.current,
            pageSize: params.pageSize,
            status: params.status,
            type: params.type,
            keyword: params.orderNo,
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
        scroll={{ x: 1400 }}
      />

      {/* 详情弹窗 */}
      <Modal
        title="订单详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={900}
      >
        {currentOrder && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="订单号">{currentOrder.orderNo}</Descriptions.Item>
            <Descriptions.Item label="类型">{typeMap[currentOrder.type]}</Descriptions.Item>
            <Descriptions.Item label="企业">{currentOrder.company?.companyName}</Descriptions.Item>
            <Descriptions.Item label="创建人">
              {currentOrder.creator?.realName || currentOrder.creator?.username}
            </Descriptions.Item>
            <Descriptions.Item label="起运港">{currentOrder.originPort}</Descriptions.Item>
            <Descriptions.Item label="目的港">{currentOrder.destinationPort}</Descriptions.Item>
            <Descriptions.Item label="货物描述" span={2}>{currentOrder.cargoDesc}</Descriptions.Item>
            <Descriptions.Item label="货物重量">{currentOrder.cargoWeight} KG</Descriptions.Item>
            <Descriptions.Item label="货物体积">{currentOrder.cargoVolume} CBM</Descriptions.Item>
            <Descriptions.Item label="集装箱类型">{currentOrder.containerType}</Descriptions.Item>
            <Descriptions.Item label="集装箱数量">{currentOrder.containerCount}</Descriptions.Item>
            <Descriptions.Item label="预计离港">
              {currentOrder.etd ? dayjs(currentOrder.etd).format('YYYY-MM-DD') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="预计到港">
              {currentOrder.eta ? dayjs(currentOrder.eta).format('YYYY-MM-DD') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="金额">
              ¥{currentOrder.totalAmount?.toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusMap[currentOrder.status].color}>
                {statusMap[currentOrder.status].text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="客户备注" span={2}>
              {currentOrder.remark || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="内部备注" span={2}>
              {currentOrder.internalRemark || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(currentOrder.createdAt).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 修改状态弹窗 */}
      <Modal
        title="修改订单状态"
        open={statusModalVisible}
        onCancel={() => setStatusModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} onFinish={handleStatusSubmit} layout="vertical">
          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择状态">
              <Select.Option value="PENDING">待确认</Select.Option>
              <Select.Option value="CONFIRMED">已确认</Select.Option>
              <Select.Option value="PROCESSING">执行中</Select.Option>
              <Select.Option value="COMPLETED">已完成</Select.Option>
              <Select.Option value="CANCELLED">已取消</Select.Option>
              <Select.Option value="REJECTED">已拒绝</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="remark" label="内部备注">
            <Input.TextArea rows={4} placeholder="请输入内部备注" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
