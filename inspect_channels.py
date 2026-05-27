from scipy.io import loadmat

data = loadmat("./data/raw/bnci_001_2014/A01T.mat")

run = data['data'][0,1]

print(run.dtype.names)


