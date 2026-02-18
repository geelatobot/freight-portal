import { useRef, useState } from 'react'
import { PageContainer } from '@ant-design/pro-components'
import ProTable from '@ant-design/pro-table'
import type { ActionType, ProColumns } from '@ant-design/pro-table'
import { Button, Space, Tag, Modal, message, Timeline, Card } from 'antd'
import { EyeOutlined, SyncOutlined } from '@ant-design/icons'
import { shipmentApi } from '@/services'
import dayjs from 'dayjs'

interface Shipment {
  id: string
  shipmentNo: string
  containerNo: string
  containerType: string
  blNo?: string
  bookingNo?: string
  carrierCode?: string
  carrierName?: string
  status: string
  currentNode?: string
  originPort: string
  originPortName: string
  destinationPort: string
  destinationPortName: string
  etd?: string
  eta?: string
  atd?: string
  ata?: string
  syncSource?: string
  lastSyncAt?: string
  createdAt: string
  orderId?: string
  companyId: string
}

interface ShipmentNode {
  id: string
  nodeCode: string
  nodeName: string
  location?: string
  eventTime: string
  description?: string
  operator?: string
}

const statusMap: Record<string, { text: string; color: string }> = {
  BOOKED: { text: '已订舱', color: 'blue' },
  EMPTY_PICKUP: { text: '提空箱', color: 'cyan' },
  GATE_IN: { text: '进港', color: 'geekblue' },
  CUSTOMS_RELEASED: { text: '海关放行', color: 'green' },
  TERMINAL_RELEASED: { text: '码头放行', color: 'green' },
  DEPARTURE: { text: '离港', color: 'purple' },
  ARRIVAL: { text: '抵港', color: 'orange' },
  DISCHARGED: { text: '卸船', color: 'gold' },
  FULL_PICKUP: { text: '提重箱', color: 'lime' },
  EMPTY_RETURN: { text: '还空箱', color: 'default' },
  COMPLETED: { text: '已完成', color: 'success' },
}

export default function ShipmentList() {
  const actionRef = useRef<ActionType>()
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [currentShipment, setCurrentShipment] = useState<Shipment | null>(null)
  const [nodes, setNodes] = useState<ShipmentNode[]>([])
  const [syncing, setSyncing] = useState<string | null>(null)

  const columns: ProColumns<Shipment>[] = [
    {
      title: '箱号',
      dataIndex: 'containerNo',
      width: 150,
      fixed: 'left',
    },
    {
      title: '提单号',
      dataIndex: 'blNo',
      width: 150,
    },
    {
      title: '箱型',
      dataIndex: 'containerType',
      width: 100,
    },
    {
      title: '船司',
      dataIndex: 'carrierName',
      width: 120,
    },
    {
      title: '起运港',
      dataIndex: 'originPortName',
      width: 150,
      ellipsis: true,
    },
    {
      title: '目的港',
      dataIndex: 'destinationPortName',
      width: 150,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (_, record) => {
        const status = statusMap[record.status] || { text: record.status, color: 'default' }
        return <Tag color={status.color}>{status.text}</Tag>
      },
    },
    {
      title: '当前节点',
      dataIndex: 'currentNode',
      width: 150,
    },
    {
      title: '同步状态',
      dataIndex: 'lastSyncAt',
      width: 180,
      render: (text) => {
        if (!text) return <Tag>未同步</Tag>
        const syncTime = dayjs(text as string)
        const now = dayjs()
        const diff = now.diff(syncTime, 'hour')
        if (diff < 1) {
          return <Tag color="success">{syncTime.format('MM-DD HH:mm')}</Tag>
        } else if (diff < 24) {
          return <Tag color="warning">{syncTime.format('MM-DD HH:mm')}</Tag>
        } else {
          return <Tag color="error">{syncTime.format('MM-DD HH:mm')}</Tag>
        }
      },
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
            icon={<SyncOutlined spin={syncing === record.id} />}
            onClick={() => handleSync(record)}
            loading={syncing === record.id}
          >
            同步
          </Button>
        </Space>
      ),
    },
  ]

  const handleViewDetail = async (record: Shipment) => {
    setCurrentShipment(record)
    setDetailModalVisible(true)
    
    // 加载节点数据
    try {
      const response = await shipmentApi.getNodes(record.id)
      setNodes(response.data || [])
    } catch (error) {
      message.error('获取节点数据失败')
    }
  }

  const handleSync = async (record: Shipment) => {
    setSyncing(record.id)
    try {
      await shipmentApi.syncStatus(record.id)
      message.success('同步成功')
      actionRef.current?.reload()
    } catch (error) {
      message.error('同步失败')
    } finally {
      setSyncing(null)
    }
  }

  return (
    <PageContainer title="货物管理">
      <ProTable<Shipment>
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
        }}
        columns={columns}
        request={async (params) => {
          const response = await shipmentApi.getList({
            page: params.current,
            pageSize: params.pageSize,
            containerNo: params.containerNo,
            blNo: params.blNo,
            status: params.status,
          })
          return {
            data: response.data.list,
            success: true,
            total: response.data.pagination?.total || 0,
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
        title="货物详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={900}
      >
        {currentShipment && (
          <div>
            <Card title="基本信息" style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <strong>箱号：</strong> {currentShipment.containerNo}
                </div>
                <div>
                  <strong>箱型：</strong> {currentShipment.containerType}
                </div>
                {currentShipment.blNo && (
                  <div>
                    <strong>提单号：</strong> {currentShipment.blNo}
                  </div>
                )}
                {currentShipment.bookingNo && (
                  <div>
                    <strong>订舱号：</strong> {currentShipment.bookingNo}
                  </div>
                )}
                {currentShipment.carrierName && (
                  <div>
                    <strong>船司：</strong> {currentShipment.carrierName}
                  </div>
                )}
                <div>
                  <strong>起运港：</strong> {currentShipment.originPortName} ({currentShipment.originPort})
                </div>
                <div>
                  <strong>目的港：</strong> {currentShipment.destinationPortName} ({currentShipment.destinationPort})
                </div>
                <div>
                  <strong>状态：</strong>{' '}
                  <Tag color={statusMap[currentShipment.status]?.color || 'default'}>
                    {statusMap[currentShipment.status]?.text || currentShipment.status}
                  </Tag>
                </div>
                <div>
                  <strong>当前节点：</strong> {currentShipment.currentNode || '-'}
                </div>
                <div>
                  <strong>预计离港：</strong>{' '}
                  {currentShipment.etd ? dayjs(currentShipment.etd).format('YYYY-MM-DD HH:mm') : '-'}
                </div>
                <div>
                  <strong>预计到港：</strong>{' '}
                  {currentShipment.eta ? dayjs(currentShipment.eta).format('YYYY-MM-DD HH:mm') : '-'}
                </div>
                {currentShipment.atd && (
                  <div>
                    <strong>实际离港：</strong>{' '}
                    {dayjs(currentShipment.atd).format('YYYY-MM-DD HH:mm')}
                  </div>
                )}
                {currentShipment.ata && (
                  <div>
                    <strong>实际到港：</strong>{' '}
                    {dayjs(currentShipment.ata).format('YYYY-MM-DD HH:mm')}
                  </div>
                )}
                <div>
                  <strong>同步来源：</strong> {currentShipment.syncSource || '-'}
                </div>
                <div>
                  <strong>最后同步：</strong>{' '}
                  {currentShipment.lastSyncAt
                    ? dayjs(currentShipment.lastSyncAt).format('YYYY-MM-DD HH:mm:ss')
                    : '-'}
                </div>
              </Space>
            </Card>

            <Card title="运输节点">
              {nodes.length > 0 ? (
                <Timeline mode="left">
                  {nodes.map((node) => (
                    <Timeline.Item
                      key={node.id}
                      label={dayjs(node.eventTime).format('YYYY-MM-DD HH:mm')}
                    >
                      <div>
                        <strong>{node.nodeName}</strong>
                        {node.location && <div>地点：{node.location}</div>}
                        {node.description && <div>{node.description}</div>}
                        {node.operator && <div>操作员：{node.operator}</div>}
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  暂无节点数据
                </div>
              )}
            </Card>
          </div>
        )}
      </Modal>
    </PageContainer>
  )
}
