"""Offline visual verification experiment; no API, inventory or identity writes."""
import cv2, numpy as np

WIDTH, HEIGHT = 640, 880
PARAMETERS = dict(features=1000, edgeThreshold=15, fastThreshold=12, ratio=.75,
                  distance=64, reprojection=3.0, inliers=40, inlier_ratio=.55,
                  art_points=8, cells=8, title=.70, art=.80, footer=.65)
orb=cv2.ORB_create(nfeatures=PARAMETERS['features'],edgeThreshold=15,fastThreshold=12)
matcher=cv2.BFMatcher(cv2.NORM_HAMMING)

def prepare(bytes_):
    raw=cv2.imdecode(np.frombuffer(bytes_,dtype=np.uint8),cv2.IMREAD_GRAYSCALE)
    if raw is None or raw.size>16_000_000: raise ValueError('Invalid image')
    rotation=90 if raw.shape[1]>raw.shape[0] else 0
    if rotation: raw=cv2.rotate(raw,cv2.ROTATE_90_CLOCKWISE)
    image=cv2.resize(raw,(WIDTH,HEIGHT))
    points,descriptor=orb.detectAndCompute(image,None)
    return image,points,descriptor,rotation

def verify(reference,scan):
    image,rk,rd,_=reference;frame,sk,sd,base=scan
    if rd is None or sd is None or len(rd)<8 or len(sd)<8:return None
    good=[pair[0] for pair in matcher.knnMatch(rd,sd,k=2) if len(pair)==2 and pair[0].distance<.75*pair[1].distance and pair[0].distance<64]
    if len(good)<40:return None
    src=np.float32([rk[m.queryIdx].pt for m in good]);dst=np.float32([sk[m.trainIdx].pt for m in good])
    cv2.setRNGSeed(1600)
    h,mask=cv2.findHomography(src,dst,cv2.RANSAC,3.0)
    if h is None or mask is None or not np.isfinite(h).all():return None
    points=src[mask[:,0]==1];count=len(points)
    art=int(((points[:,1]>132)&(points[:,1]<528)).sum());cells=len(set((int(x//160),int(y//147))for x,y in points))
    if count<40 or count/len(good)<.55 or art<8 or cells<8:return None
    corners=cv2.perspectiveTransform(np.float32([[[0,0],[640,0],[640,880],[0,880]]]),h)[0]
    if not np.isfinite(corners).all() or not cv2.isContourConvex(corners):return None
    area=cv2.contourArea(corners,oriented=True)/(WIDTH*HEIGHT)
    if area<.65 or area>1.15 or (corners[:,0]<-64).any() or (corners[:,0]>704).any() or (corners[:,1]<-88).any() or (corners[:,1]>968).any():return None
    direction=corners[1]-corners[0];angle=float(np.degrees(np.arctan2(direction[1],direction[0])))
    turn=round(angle/90)*90
    if abs(angle-turn)>12:return None
    warped=cv2.warpPerspective(frame,np.linalg.inv(h),(WIDTH,HEIGHT));ncc={}
    for label,box in [('title',(32,22,608,141)),('art',(40,150,600,515)),('footer',(20,783,620,862))]:
        x1,y1,x2,y2=box;a=image[y1:y2,x1:x2].astype(float);b=warped[y1:y2,x1:x2].astype(float)
        if a.std()<8 or b.std()<8:return None
        ncc[label]=float(np.corrcoef(a.flatten(),b.flatten())[0,1])
        if not np.isfinite(ncc[label]) or ncc[label]<PARAMETERS[label]:return None
    return dict(inliers=count,matches=len(good),art_points=art,cells=cells,correlation=ncc,rotation=(base-turn)%360)
