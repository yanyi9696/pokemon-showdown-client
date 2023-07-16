import cv2
import numpy as np

kernal = np.ones((1, 5), np.uint8)
img = cv2.imread('./raw/plotmon.jpg')
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
ret, binary = cv2.threshold(gray, 252, 255, cv2.THRESH_BINARY)
binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernal, anchor=(2, 0), iterations=3)
contours,h = cv2.findContours(binary, cv2.RETR_TREE, cv2.CHAIN_APPROX_NONE)
cv2.drawContours(img, contours, -1, (0, 0, 255), 3)
cv2.imwrite('./cache/plotmon.png', img)

# final = np.zeros(img.shape, np.uint8)
# mask = np.zeros(gray.shape, np.uint8)

# for i in range(0, len(contours)):
#     mask[...]=0
#     cv2.drawContours(mask, contours, i, 255,-1)
#     cv2.drawContours(final, contours, i, cv2.mean(img, mask), -1)

# cv2.imwrite('./cache/agnimon.png', mask)
