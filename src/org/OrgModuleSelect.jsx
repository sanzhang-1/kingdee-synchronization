import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { bitable } from '@lark-base-open/connector-api';
import axios from 'axios';
import CryptoJS from 'crypto-js'; // 新增：加密库，需先安装 npm install crypto-js
import './OrgModuleSelect.css';

// 核心常量（与后端保持一致，生产需从安全存储获取）
const APP_KEY = 'kd_sync_202601';
const APP_SECRET = '9s7K2p8Q5r9B4m7X8z6C1v3N8t5G7b9';

// 金蝶模块列表（数据源）
const kingdeeModules = [
  { value: 'PUR_PurchaseOrder', label: '采购订单' },
  { value: 'PUR_Requisition', label: '采购申请' },
  { value: 'BD_MATERIAL', label: '物料' },
  { value: 'BD_Supplier', label: '供应商' },
  { value: 'BD_Customer', label: '客户' }
];

function OrgModuleSelect() {
  // 1. 路由相关Hooks
  const location = useLocation();
  const navigate = useNavigate();

  // 2. 状态管理
  const [orgList, setOrgList] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [loading, setLoading] = useState(false);
  const [configData, setConfigData] = useState({
    orgId: '',
    userId: '',
    documentType: '',
    configId: ''
  });

  // 新增：生成SHA-1签名方法（复用通用逻辑）
  const generateSignature = (timestamp, nonce, bodyStr) => {
    // 按固定顺序拼接：timestamp + nonce + appSecret + body
    const signStr = timestamp + nonce + APP_SECRET + bodyStr;
    // SHA-1加密并转为十六进制字符串
    return CryptoJS.SHA1(signStr).toString(CryptoJS.enc.Hex);
  };

  // 3. 初始化组织列表
  useEffect(() => {
    // 校验路由参数
    if (!location.state || !location.state.orgList) {
      alert('未获取到组织数据，请返回重新提交！');
      navigate('/');
      return;
    }
    setOrgList(location.state.orgList);
    // 默认选中第一个组织
    if (location.state.orgList.length > 0) {
      setSelectedOrg(location.state.orgList[0].orgId);
    }
  }, [location, navigate]);

  // 监听configData变化
  useEffect(() => {
    if (configData.orgId && configData.userId) {
      console.log('✅ configData最新值（监听触发）：', configData);
    }
  }, [configData]);

  // 4. 组织选择变更
  const handleOrgChange = (e) => {
    setSelectedOrg(e.target.value);
  };

  // 5. 模块选择变更
  const handleModuleChange = (e) => {
    setSelectedModule(e.target.value);
  };

  // 6. 下一步提交逻辑（核心改造：添加签名+优化安全）
  const handleNext = async () => {
    // 表单校验
    if (!selectedOrg) {
      alert('请选择账套！');
      return;
    }
    if (!selectedModule) {
      alert('请选择需要同步的金蝶业务单据！');
      return;
    }

    try {
      // 安全获取飞书用户ID（增加异常捕获）
      const userId = await bitable.getUserId();
      if (!userId) {
        throw new Error('获取飞书用户ID失败，请检查权限！');
      }

      // 准备请求参数
      const requestData = {
        orgId: selectedOrg,
        documentType: selectedModule,
        userId: userId
      };

      // 新增：生成签名所需参数
      const timestamp = Date.now().toString(); // 毫秒级时间戳
      const nonce = Math.random().toString(36).substring(2, 18); // 16位随机串
      const bodyStr = JSON.stringify(requestData); // 请求体字符串
      const signature = generateSignature(timestamp, nonce, bodyStr); // 生成签名

      // 设置加载状态
      setLoading(true);

      // 调用Java接口（添加签名请求头）
      const response = await axios.post(
        '/prod-api/kingdee/addOrgDocumentType',
        requestData,
        {
          headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'X-App-Key': APP_KEY, // 应用标识
            'X-Timestamp': timestamp, // 时间戳
            'X-Nonce': nonce, // 随机串
            'X-Signature': signature // 签名
          },
          timeout: 10000 // 超时时间
        }
      );

      // 接口成功处理
      if (response.status === 200 && response.data) {
        // 准备新的配置数据（补全configId）
        const newConfigData = {
          orgId: selectedOrg,
          userId: userId,
          documentType: selectedModule,
          configId: response.data.configId || ''
        };
        // 更新状态
        setConfigData(newConfigData);
        
        console.log('✅ 接口返回数据（新值）：', newConfigData);
        
        // 调用飞书保存配置方法
        await bitable.saveConfigAndGoNext(newConfigData);
      } else {
        throw new Error('接口返回数据异常，请重试！');
      }
    } catch (error) {
      // 精细化异常提示（区分签名/网络/业务错误）
      console.error('❌ 提交失败详情：', error);
      let errorMsg = '提交失败：';
      if (error.message) {
        errorMsg += error.message;
      } else if (error.response) {
        // 新增：识别签名错误提示
        if (error.response.data?.msg?.includes('签名验证失败')) {
          errorMsg += '身份验证失败，请刷新页面重试！';
        } else {
          errorMsg += `服务器错误（${error.response.status}）：${error.response.data?.msg || '未知错误'}`;
        }
      } else if (error.request) {
        errorMsg += '网络异常，无法连接服务器！';
      }
      alert(errorMsg);
    } finally {
      // 无论成功失败，关闭加载状态
      setLoading(false);
    }
  };

  // 渲染页面（无改动）
  return (
    <div className="config-page">
      <div className="page-title">数据同步配置</div>
      <div className="content-container">
        {/* 组织选择模块 */}
        <div className="config-card">
          <div className="card-title">组织选择</div>
          <div className="card-desc">选择需同步的金蝶账套</div>
          <div className="select-wrapper">
            <label className="select-label">选择账套</label>
            <select
              value={selectedOrg}
              onChange={handleOrgChange}
              className="form-select"
              disabled={loading}
            >
              {orgList.map((org) => (
                <option key={org.orgId} value={org.orgId}>
                  {org.orgName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 数据源选择模块 */}
        <div className="config-card">
          <div className="card-title">数据源选择</div>
          <div className="card-desc">选择需要同步的金蝶业务单据（单选）</div>
          <div className="select-wrapper">
            <label className="select-label">选择单据类型</label>
            <select
              value={selectedModule}
              onChange={handleModuleChange}
              className="form-select"
              disabled={loading}
            >
              <option value="">-- 请选择业务单据 --</option>
              {kingdeeModules.map((module) => (
                <option key={module.value} value={module.value}>
                  {module.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 下一步按钮 */}
      <div className="btn-footer">
        <button
          className="next-btn"
          onClick={handleNext}
          disabled={loading}
        >
          {loading ? '提交中...' : '下一步'}
        </button>
      </div>
    </div>
  );
}

export default OrgModuleSelect;