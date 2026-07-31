
đầu tiên cần tạo sơ đồ cây thư mục tệp giữ đầu trang chân trang menu  main  Design system  css js html puplic/img upload giao diện như một trang tin cách sắp xếp bố cụ giao diện như /var/www/document/desktop.png
/var/www/document/mobile.png 
 đề án để mọi báo cáo của .bob Users should independently verify accuracy of AI-generated content. sau khi tạo kế hoạch lộ trình báo cáo html sẽ tự tải xuống thư mục /var/www/document  sau khi hỗ trợ code xong cần tải xuống /var/www/document sắp xếp các trang .html vào 1 thư mục sau đó map vào index.html  
cấu hình nginx không xoá nginx không ảnh hưởng web khác npm node thì cài nvm thêm vào path  db thì tải phpmyadmin tạo db  riêng  domain vnrk.vn  vnrk.vn.conf 
/var/www/document bob sẽ tiếp nhận task và trả về html tại đây phục vụ xây dựng cho  database và core 
/var/www/database
/var/www/core
nếu gặp ảnh png cần nén webp cho nhẹ
thư viện icon thì dưới đây cần tải thư viện về để phục vụ cho dự án 
@mui/icons-material includes the 2,100+ official Material Icons converted to SvgIcon components. It depends on @mui/material, which requires Emotion packages. Use one of the following commands to install it:

npm
pnpm
yarn
Copy
npm install @mui/icons-material @mui/material @emotion/styled @emotion/react
See the Installation page for additional docs about how to make sure everything is set up correctly.

Google offers Material Symbols as the successor to Material Icons. However, @mui/icons-material currently supports only Icons, with no support for Symbols yet.


Độ tương phản màu sắc không đạt chuẩn
Nhiều thành phần văn bản trên trang có tỷ lệ tương phản dưới 4.5:1, gây khó khăn cho người dùng khi đọc thông tin.

Thẻ "ĐỀ ÁN THÍ ĐIỂM": Màu chữ trắng trên nền vàng cam (#e6a817) chỉ đạt 2.1:1.
Khắc phục: Thay đổi nền thành màu tối hơn hoặc đổi màu chữ sang màu đen/xám đậm để đạt chuẩn WCAG AA.
Thanh thông tin (Info bar): Màu chữ xám (#6b7a8d) trên nền xanh nhạt (#e8f0fb) không đủ rõ ràng.
Khắc phục: Sử dụng mã màu Text Secondary của Ant Design (rgba(0, 0, 0, 0.65)) hoặc đậm hơn trên nền sáng.
Ngày tháng và nhãn tin tức: Màu chữ hiện tại quá nhạt so với nền trắng.
Khắc phục: Chuyển sang màu #595959 (Gray 8 trong Ant Design) để đảm bảo tính thẩm mỹ và dễ đọc.
Kích thước vùng tương tác (Touch Targets)
Các liên kết trong phần Footer (như "Smart Contracts", "SBV API Gateway") có chiều cao chỉ 16.5px, quá nhỏ để thao tác chính xác bằng ngón tay trên thiết bị di động.

Khắc phục: Tăng chiều cao dòng (line-height) hoặc thêm padding để đảm bảo vùng nhấn tối thiểu là 24x24px (tốt nhất là 44x44px theo chuẩn Apple/Google). Trong Ant Design, bạn nên dùng component Space hoặc Typography.Link với khoảng cách middle.
Cấu trúc ngữ nghĩa và Landmark
Trang web hiện thiếu các thẻ chỉ dẫn vùng quan trọng, khiến công cụ hỗ trợ người khiếm thị không thể điều hướng nhanh.

Vấn đề: Thiếu thẻ <main> bao bọc nội dung chính.
Thứ tự tiêu đề: Thẻ h4 ở Footer đang bị nhảy bậc, không tuân theo thứ tự logic từ h1 đến h6.
Khắc phục:
Bao bọc toàn bộ phần nội dung chính giữa Header và Footer trong thẻ <main>.
Điều chỉnh các tiêu đề Footer thành bậc tiếp theo ngay sau tiêu đề lớn nhất của khu vực đó (ví dụ: nếu nội dung chính kết thúc ở h2, Footer nên bắt đầu từ h3).
Chuẩn hóa theo Ant Design / Umi
Để giao diện đồng nhất với hệ sinh thái Ant Design:
Quick Start
Installation
$ npm install --save antd-mobile
# or
$ yarn add antd-mobile
# or
$ pnpm add antd-mobile
# or
$ bun add antd-mobile
Import
Just import the component directly and antd-mobile will automatically load css style files:

import { Button } from 'antd-mobile'
If you are developing an internal project in alibaba group or ant group, please read this additional guide.

If you are using the umi framework, it is recommended to read "How to solve the error after installing antd-mobile v5 in the umi project?" in the FAQ.

Compatibility
We recommend adding the following babel configuration, so that maximum compatibility can be achieved (iOS Safari >= 10 and Chrome >= 49):

{
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": {
          "chrome": "49",
          "ios": "10"
        }
      }
    ]
  ]
}
Do not exclude node_modules from babel compilation, otherwise the above configuration will not work
For TypeScript, antd-mobile is compatible with versions >= 3.8.

For React, antd-mobile is compatible with versions ^16.8.0 and ^17.0.0.

Since iOS 9 does not support CSS variables, if you need to support iOS 9, please refer to this document to enable automatic CSS variable degradation, and set target ios in babel configuration to 9.

Playground
If you don't want to configure your environment locally, you can also try it directly on codesandbox or stackblitz
Typography: Sử dụng các Scale của Ant Design thay vì các cỡ chữ lẻ như 9.5px hay 10px. Cỡ chữ tối thiểu nên là 12px (Caption) và mặc định là 14px.
Layout: Sử dụng component Layout, Header, Content, Footer từ thư viện antd để tự động tối ưu hóa các vùng Landmark.
