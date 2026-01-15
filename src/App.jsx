import { useState } from 'react';
import { bitable } from '@lark-base-open/connector-api';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import CryptoJS from 'crypto-js'; // 新增：加密库
import './App.css';

// 核心常量（前后端一致，生产需从安全存储获取）
const APP_KEY = 'kd_sync_202601';
const APP_SECRET = '9s7K2p8Q5r9B4m7X8z6C1v3N8t5G7b9';

function App() {
  const [formData, setFormData] = useState({
    xKdapiAppid: '',
    xKdapiAcctid: '',
    xKdapiUsername: '',
    xKdapiAppsec: '',
    xKdapiServerurl: '',
    userId: '1'
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 输入框变更处理（不变）
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 新增：生成SHA-1签名
  const generateSignature = (timestamp, nonce, bodyStr) => {
    // 按顺序拼接：timestamp + nonce + appSecret + body
    const signStr = timestamp + nonce + APP_SECRET + bodyStr;
    // SHA-1加密并转为十六进制字符串
    return CryptoJS.SHA1(signStr).toString(CryptoJS.enc.Hex);
  };

  // 提交处理（改造：添加签名）
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      // 1. 获取用户ID
      formData.userId = await bitable.getUserId();
      
      // 2. 生成签名所需参数
      const timestamp = Date.now().toString(); // 时间戳（毫秒）
      const nonce = Math.random().toString(36).substring(2, 18); // 随机串（16位）
      const bodyStr = JSON.stringify(formData); // 请求体字符串

      // 3. 生成签名
      const signature = generateSignature(timestamp, nonce, bodyStr);

      // 4. 发送请求（添加签名请求头）
      const response = await axios.post(
        '/prod-api/kingdee/add',
        formData,
        {
          headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'X-App-Key': APP_KEY, // 应用标识
            'X-Timestamp': timestamp, // 时间戳
            'X-Nonce': nonce, // 随机串
            'X-Signature': signature // 签名
          },
          timeout: 10000
        }
      );

      // 5. 成功处理（不变）
      console.log('接口返回数据：', response.data);
      if (response.data.code === 200) {
        setFormData({
          xKdapiAppid: '',
          xKdapiAcctid: '',
          xKdapiUsername: '',
          xKdapiAppsec: '',
          xKdapiServerurl: ''
        });
        navigate('/org-module-select', {
          state: {
            orgList: response.data.data,
            msg: response.data.msg
          }
        });
      }
    } catch (error) {
      // 异常处理（优化提示）
      console.error('提交失败：', error);
      let errorMsg = '提交失败！';
      if (error.response) {
        errorMsg += ` 错误码：${error.response.status}，信息：${error.response.data?.msg || '服务器处理失败'}`;
      } else if (error.request) {
        errorMsg += ' 网络异常，请检查连接或接口地址';
      } else {
        errorMsg += ' ' + error.message;
      }
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // 页面渲染（不变）
  return (
    <div className="config-container">
      <div className="config-modal">
        <div className="modal-header">
          <h2>金蝶云星空 数据同步配置</h2>
          <button className="close-btn">×</button>
        </div>
        <form onSubmit={handleSubmit} className="config-form">
          {/* 金蝶应用ID */}
          <div className="form-item">
            <label className="form-label">
              <span className="required">*</span>
              金蝶应用ID
            </label>
            <input
              type="text"
              name="xKdapiAppid"
              value={formData.xKdapiAppid}
              onChange={handleInputChange}
              placeholder="请输入金蝶应用ID"
              className="form-input"
              required
              disabled={loading}
            />
          </div>
          {/* 金蝶账套ID */}
          <div className="form-item">
            <label className="form-label">
              <span className="required">*</span>
              金蝶账套ID
            </label>
            <input
              type="text"
              name="xKdapiAcctid"
              value={formData.xKdapiAcctid}
              onChange={handleInputChange}
              placeholder="请输入金蝶账套ID"
              className="form-input"
              required
              disabled={loading}
            />
          </div>
          {/* 金蝶用户名称 */}
          <div className="form-item">
            <label className="form-label">
              <span className="required">*</span>
              金蝶用户名称
            </label>
            <input
              type="text"
              name="xKdapiUsername"
              value={formData.xKdapiUsername}
              onChange={handleInputChange}
              placeholder="请输入金蝶用户名称"
              className="form-input"
              required
              disabled={loading}
            />
          </div>
          {/* 金蝶应用密钥 */}
          <div className="form-item">
            <label className="form-label">
              <span className="required">*</span>
              金蝶应用密钥
            </label>
            <input
              type="password"
              name="xKdapiAppsec"
              value={formData.xKdapiAppsec}
              onChange={handleInputChange}
              placeholder="请输入金蝶应用密钥"
              className="form-input"
              required
              disabled={loading}
            />
          </div>
          {/* 金蝶应用地址 */}
          <div className="form-item">
            <label className="form-label">
              <span className="required">*</span>
              金蝶应用地址
            </label>
            <input
              type="text"
              name="xKdapiServerurl"
              value={formData.xKdapiServerurl}
              onChange={handleInputChange}
              placeholder="请输入金蝶应用地址"
              className="form-input"
              required
              disabled={loading}
            />
          </div>
          {/* 提交按钮 */}
          <div className="submit-wrapper">
            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              {loading ? '提交中...' : '提交'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;