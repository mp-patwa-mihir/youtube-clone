'use client';

import { InboxOutlined } from '@ant-design/icons';
import { Upload, message } from 'antd';

const { Dragger } = Upload;

function UploadComponent() {
  return (
    <Dragger
      name="video"
      multiple={false}
      accept="video/*"
      customRequest={({ file, onSuccess, onError }) => {
        const formData = new FormData();
        formData.append('video', file);

        fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.url) {
              message.success('Video uploaded successfully');
              console.log('M3U8 URL:', data.url);
              onSuccess(data);
            } else {
              throw new Error(data.error || 'Upload failed');
            }
          })
          .catch(onError);
      }}
    >
      <p className="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p className="ant-upload-text">Click or drag video to upload</p>
      <p className="ant-upload-hint">Supports HLS conversion</p>
    </Dragger>
  );
}

export default UploadComponent;
