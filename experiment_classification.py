import numpy as np

from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score

from extract_features import train_features, test_features
from build_subject_dataset import y_train, y_test


# -----------------------------------
# RAW CLASSIFIER
# -----------------------------------

clf_raw = LogisticRegression(max_iter=1000)

clf_raw.fit(train_features, y_train)

raw_preds = clf_raw.predict(test_features)

raw_acc = accuracy_score(y_test, raw_preds)

print(f"RAW accuracy: {raw_acc:.3f}")


# -----------------------------------
# COVARIANCE WHITENING
# -----------------------------------

mu = np.mean(train_features, axis=0)

cov = np.cov(train_features, rowvar=False)

cov += 1e-6 * np.eye(cov.shape[0])

eigvals, eigvecs = np.linalg.eigh(cov)

W = eigvecs @ np.diag(1.0 / np.sqrt(eigvals)) @ eigvecs.T

X_train_aligned = (train_features - mu) @ W
X_test_aligned = (test_features - mu) @ W

clf_align = LogisticRegression(max_iter=1000)

clf_align.fit(X_train_aligned, y_train)

aligned_preds = clf_align.predict(X_test_aligned)

aligned_acc = accuracy_score(y_test, aligned_preds)

print(f"WHITENED accuracy: {aligned_acc:.3f}")


# -----------------------------------
# MOVING-AVERAGE ADAPTATION
# -----------------------------------

alpha = 0.05

running_mean = np.mean(train_features, axis=0)

X_test_adapted = []

for x in test_features:

    x_aligned = x - running_mean

    X_test_adapted.append(x_aligned)

    running_mean = (
        (1 - alpha) * running_mean
        + alpha * x
    )

X_test_adapted = np.array(X_test_adapted)

clf_adapt = LogisticRegression(max_iter=1000)

clf_adapt.fit(train_features, y_train)

adapt_preds = clf_adapt.predict(X_test_adapted)

adapt_acc = accuracy_score(y_test, adapt_preds)

print(f"MOVING AVG accuracy: {adapt_acc:.3f}")

